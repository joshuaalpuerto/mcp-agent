import readline from 'readline';

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

async function main(): Promise<number> {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  let pendingCallId: string | null = null;
  let query = 'mcp-agent overview';

  for await (const raw of rl) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    let message: IncomingMessage;
    try {
      message = JSON.parse(line) as IncomingMessage;
    } catch {
      // Ignore malformed input to keep stdout JSONL-only.
      continue;
    }

    if (message.type === 'task_start') {
      const task = message as TaskStartMessage;
      query = pickQuery(task.input || {});
      const callId = 'c1';
      pendingCallId = callId;
      send({
        type: 'tool_call',
        name: 'search_docs',
        call_id: callId,
        args: { q: query },
      });
      continue;
    }

    if (message.type === 'tool_result') {
      const resultMessage = message as ToolResultMessage;
      if (!pendingCallId || resultMessage.call_id !== pendingCallId) {
        continue;
      }
      const resultText = resultMessage.ok ? JSON.stringify(resultMessage.result ?? {}) : '';
      send({
        type: 'final_output',
        output: {
          category: 'docs',
          reply: resultText
            ? `Found docs for "${query}": ${resultText}`
            : `Completed lookup for "${query}".`,
        },
      });
      return 0;
    }
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
