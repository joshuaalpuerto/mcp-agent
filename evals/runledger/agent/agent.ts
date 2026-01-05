import readline from 'readline';
import { Agent, SimpleMemory, type LLMInterface, type LLMResult } from '../../src';
import { v4 as uuidv4 } from 'uuid';

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
    const m = messages[i];
    if (m.role === 'user' && typeof m.content === 'string') {
      return m.content;
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

  // Track pending tool_result resolutions keyed by call_id.
  const resolvers: Record<
    string,
    { resolve: (m: ToolResultMessage) => void; reject: (e: Error) => void }
  > = {};

  const waitForToolResult = (callId: string): Promise<ToolResultMessage> =>
    new Promise((resolve, reject) => {
      resolvers[callId] = { resolve, reject };
    });

  const handleToolResult = (msg: ToolResultMessage) => {
    const entry = resolvers[msg.call_id];
    if (entry) {
      entry.resolve(msg);
      delete resolvers[msg.call_id];
    }
  };

  for await (const raw of rl) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    let message: IncomingMessage;
    try {
      message = JSON.parse(line) as IncomingMessage;
    } catch {
      continue; // keep stdout JSONL-only
    }

    if (message.type === 'tool_result') {
      handleToolResult(message as ToolResultMessage);
      continue;
    }

    if (message.type !== 'task_start') {
      continue;
    }

    const task = message as TaskStartMessage;
    const query = pickQuery(task.input || {});

    // Build a real Agent but monkey-patch callTool to emit RunLedger tool_call / await tool_result.
    const llm = new StubLLM('search_docs');
    const agent = new Agent({
      name: 'runledger',
      description: 'Deterministic CI check',
      llm,
      history: new SimpleMemory(),
      maxIterations: 2,
    });

    (agent as any).callTool = async (toolName: string, args: Record<string, unknown>) => {
      const callId = uuidv4();
      send({ type: 'tool_call', name: toolName, call_id: callId, args });
      const toolResult = await waitForToolResult(callId);
      if (!toolResult.ok) {
        throw new Error(String(toolResult.error ?? 'tool error'));
      }
      const text = JSON.stringify(toolResult.result ?? {});
      return { content: [{ type: 'text', text }] };
    };

    // Kick off the agent using the prompt.
    const replyText = await agent.generateStr(query);
    send({
      type: 'final_output',
      output: {
        category: 'docs',
        reply: replyText || `Completed lookup for "${query}".`,
      },
    });
    return 0;
  }

  return 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch(() => {
    process.exitCode = 1;
  });
