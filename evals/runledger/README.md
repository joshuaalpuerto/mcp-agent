# RunLedger Evaluation Suite

This directory contains the deterministic evaluation suite for `mcp-agent`, powered by [RunLedger](https://pypi.org/project/runledger/) — a Python-based framework for reproducible agent testing through cassette replay.

## How It Works

RunLedger validates agent behaviour by replaying pre-recorded tool interactions (cassettes) and checking the final output against a JSON schema and a baseline of expected metrics.

### Data Flow

```
GitHub Actions (CI)
  └─ runledger run evals/runledger --mode replay --baseline baselines/runledger-demo.json
       ├── reads suite.yaml (suite configuration)
       ├── spawns agent process via agent_command
       │     node --loader ts-node/esm evals/runledger/agent/agent.ts
       │
       │   ┌──────── stdio JSON protocol ────────┐
       │   │  RunLedger ──▶ task_start  ──▶ Agent │
       │   │  Agent     ──▶ tool_call   ──▶ RunLedger
       │   │  RunLedger ──▶ tool_result ──▶ Agent │  (replayed from cassette)
       │   │  Agent     ──▶ final_output──▶ RunLedger
       │   └─────────────────────────────────────┘
       │
       ├── validates final_output against schema.json
       ├── checks budgets (wall time, tool calls, tool errors)
       └── compares metrics against baselines/runledger-demo.json
```

### Message Protocol (stdin/stdout)

The agent communicates with RunLedger via newline-delimited JSON on stdin/stdout:

| Direction | Type | Purpose |
|---|---|---|
| RunLedger → Agent | `task_start` | Sends the test input (e.g. `{ "prompt": "What is mcp-agent?" }`) |
| Agent → RunLedger | `tool_call` | Agent requests a tool invocation |
| RunLedger → Agent | `tool_result` | RunLedger replies with the cassette-recorded result |
| Agent → RunLedger | `final_output` | Agent sends its final answer |

### Directory Layout

```
evals/runledger/
├── README.md           ← this file
├── suite.yaml          ← suite configuration (agent command, mode, budgets, assertions)
├── schema.json         ← JSON schema that final_output must satisfy
├── agent/
│   └── agent.ts        ← test agent: real Agent + StubLLM + monkey-patched callTool
├── cases/
│   └── t1.yaml         ← test case definition (id, description, input)
└── cassettes/
    └── t1.jsonl        ← pre-recorded tool responses for replay
```

## Key Components

### `suite.yaml`

Configures the evaluation run:

- **`agent_command`** — command to start the agent process.
- **`mode`** — `replay` uses cassette recordings instead of live tool calls.
- **`tool_registry`** — list of tool names the agent may call.
- **`assertions`** — validation rules (e.g. JSON schema check on `final_output`).
- **`budgets`** — limits on wall time (`max_wall_ms`), tool calls (`max_tool_calls`), and errors (`max_tool_errors`).
- **`baseline_path`** — path to the baseline JSON for regression comparison.

### `agent/agent.ts`

A standalone test agent that wires up a real `Agent` instance from `mcp-agent` with:

1. **`StubLLM`** — a deterministic LLM that always makes exactly one tool call then returns the result. This removes non-determinism from the evaluation.
2. **Monkey-patched `callTool`** — instead of invoking a real MCP server, it writes a `tool_call` message to stdout and waits for a `tool_result` on stdin (provided by RunLedger from the cassette).

### Cassettes (`cassettes/*.jsonl`)

Each line is a JSON object describing a tool interaction:

```json
{"tool":"search_docs","args":{"q":"What is mcp-agent?"},"ok":true,"result":{"hits":[{"title":"mcp-agent","snippet":"TypeScript framework for MCP agents."}]}}
```

In `replay` mode RunLedger matches outgoing `tool_call` messages to cassette entries and returns the recorded `tool_result`.

### Baselines (`baselines/runledger-demo.json`)

Stores expected metrics (pass rate, tool call counts, wall time, etc.) from a known-good run. CI fails if the current run regresses beyond acceptable thresholds.

## Running Locally

```bash
# Install the RunLedger CLI (Python ≥ 3.11)
python -m pip install "runledger==0.1.0"

# Install Node.js dependencies
npm install   # or pnpm install

# Run the evaluation suite in replay mode
runledger run evals/runledger --mode replay --baseline baselines/runledger-demo.json
```

Results are written to `runledger_out/`.

## Adding a New Test Case

1. Create a case file in `cases/` (e.g. `cases/t2.yaml`):
   ```yaml
   id: t2
   description: "describe what this test verifies"
   input:
     prompt: "Your test prompt here"
   cassette: cassettes/t2.jsonl
   ```

2. Record the cassette in `cassettes/t2.jsonl` with the expected tool interactions.

3. Run the suite and update the baseline:
   ```bash
   runledger run evals/runledger --mode replay --baseline baselines/runledger-demo.json
   ```

## CI Integration

The GitHub Actions workflow at `.github/workflows/runledger.yml` runs this suite automatically on every pull request and push to `main`. It:

1. Sets up Node.js 21 and Python 3.11
2. Installs `runledger` and project dependencies
3. Runs the evaluation in replay mode against the baseline
4. Uploads the results as build artifacts (`runledger-artifacts`)
