import readline from 'readline';
import { randomUUID } from 'crypto';
import { Agent, Logger, LogLevel, SimpleMemory, type LLMInterface, type LLMResult } from '../../../src';

type TaskStartMessage = {
  type: 'task_start';
  task_id: string;
  input: Record<string, unknown>;
};

type ToolResultMessage = {
  type: 'tool_result';
  call_id: string;
  ok: boolean;
  result?: unknown;
  error?: unknown;
};

type IncomingMessage = TaskStartMessage | ToolResultMessage | { type: string };

type ToolCallMessage = {
  type: 'tool_call';
  name: string;
  call_id: string;
  args: Record<string, unknown>;
};

type FinalOutputMessage = {
  type: 'final_output';
  output: Record<string, unknown>;
};

function send(payload: ToolCallMessage | FinalOutputMessage): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function pickQuery(input: Record<string, unknown>): string {
  const candidate =
    (typeof input.prompt === 'string' && input.prompt) ||
    (typeof input.query === 'string' && input.query) ||
    (typeof input.ticket === 'string' && input.ticket);
  if (candidate) {
    return candidate;
  }
  const fallback = JSON.stringify(input);
  return fallback === '{}' ? 'mcp-agent overview' : fallback;
}

function lastUserContent(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role === 'user' && typeof message.content === 'string') {
      return message.content;
    }
  }
  return '';
}

// Minimal deterministic LLM that always calls the configured tool once,
// then stops after receiving the tool response.
class StubLLM implements LLMInterface {
  constructor(private toolName: string) {}

  async generate(params: { messages: any[]; config: any }): Promise<LLMResult> {
    const { messages } = params;
    const toolMessage = messages.findLast?.((m: any) => m.role === 'tool') ||
      [...messages].reverse().find((m: any) => m.role === 'tool');

    if (toolMessage) {
      const contentStr =
        typeof toolMessage.content === 'string'
          ? toolMessage.content
          : JSON.stringify(toolMessage.content ?? {});
      return {
        content: `Docs lookup complete: ${contentStr}`,
        toolCalls: [],
        finishReason: 'stop',
      };
    }

    const prompt = lastUserContent(messages);
    return {
      content: null,
      toolCalls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: this.toolName,
            arguments: JSON.stringify({ q: prompt || 'mcp-agent overview' }),
          },
        } as any,
      ],
      finishReason: 'tool_calls',
    };
  }
}

async function main(): Promise<number> {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

  // Resolve pending tool_result messages by call_id.
  const pendingToolResults = new Map<
    string,
    { resolve: (m: ToolResultMessage) => void; reject: (e: Error) => void; timeoutId: NodeJS.Timeout }
  >();

  const waitForToolResult = (callId: string, timeoutMs = 20_000): Promise<ToolResultMessage> =>
    new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingToolResults.delete(callId);
        reject(new Error(`Timeout waiting for tool_result: ${callId}`));
      }, timeoutMs);
      pendingToolResults.set(callId, { resolve, reject, timeoutId });
    });

  const handleToolResult = (msg: ToolResultMessage) => {
    const entry = pendingToolResults.get(msg.call_id);
    if (!entry) {
      return;
    }
    clearTimeout(entry.timeoutId);
    pendingToolResults.delete(msg.call_id);
    entry.resolve(msg);
  };

  const logger = Logger.getInstance(
    {
      info: (message: string) => process.stderr.write(`${message}\n`),
      warn: (message: string) => process.stderr.write(`${message}\n`),
      debug: (message: string) => process.stderr.write(`${message}\n`),
      error: (message: string) => process.stderr.write(`${message}\n`),
    },
    { level: LogLevel.ERROR }
  );

  let started = false;

  const runTask = async (task: TaskStartMessage): Promise<void> => {
    const query = pickQuery(task.input || {});

    // Build a real Agent but monkey-patch callTool to emit RunLedger tool_call / await tool_result.
    const llm = new StubLLM('search_docs');
    const agent = new Agent({
      name: 'runledger',
      description: 'Deterministic CI check',
      llm,
      history: new SimpleMemory(),
      maxIterations: 2,
      logger,
    });

    (agent as any).callTool = async (toolName: string, args: Record<string, unknown>) => {
      const callId = randomUUID();
      send({ type: 'tool_call', name: toolName, call_id: callId, args });
      const toolResult = await waitForToolResult(callId);
      if (!toolResult.ok) {
        throw new Error(String(toolResult.error ?? 'tool error'));
      }
      const text = JSON.stringify(toolResult.result ?? {});
      return { content: [{ type: 'text', text }] };
    };

    const replyText = await agent.generateStr(query);

    send({
      type: 'final_output',
      output: {
        category: 'docs',
        reply: replyText || `Completed lookup for "${query}".`,
      },
    });
  };

  rl.on('line', (raw) => {
    const line = raw.trim();
    if (!line) {
      return;
    }
    let message: IncomingMessage;
    try {
      message = JSON.parse(line) as IncomingMessage;
    } catch {
      return;
    }

    if (message.type === 'tool_result') {
      handleToolResult(message as ToolResultMessage);
      return;
    }

    if (message.type === 'task_start' && !started) {
      started = true;
      runTask(message as TaskStartMessage)
        .then(() => {
          rl.close();
          process.exitCode = 0;
        })
        .catch((error) => {
          process.stderr.write(String(error) + '\n');
          rl.close();
          process.exitCode = 1;
        });
      return;
    }
  });

  return await new Promise<number>((resolve) => {
    rl.on('close', () => {
      if (!started) {
        resolve(1);
        return;
      }
      resolve(process.exitCode ?? 0);
    });
  });
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch(() => {
    process.exitCode = 1;
  });
