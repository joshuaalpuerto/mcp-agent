# AI Coding Agent Instructions for `mcp-agent`

These instructions help AI coding agents work effectively in this repository. Focus on concrete patterns actually used here—avoid inventing abstractions that aren't present.

## Project Overview
`mcp-agent` is a TypeScript framework for building multi‑agent, tool‑using AI systems over the Model Context Protocol (MCP). It adapts patterns from the Python `lastmile-ai/mcp-agent` to the JS/TS ecosystem.

Key capabilities (runtime realities, not aspirations):
- Agent abstraction: role + instructions + tools (MCP + local function tools) + LLM.
- Two‑layer MCP tool model: global connection manager (single instance per MCP server) + per‑agent aggregator (agent‑scoped view of tools).
- Orchestrator workflow: plans (LLM) -> executes step tasks via agents -> synthesizes final answer.
- Pluggable LLM provider (Fireworks example via `LLMFireworks`).
- Simple in‑memory conversation state (`SimpleMemory`).
- Event surfaces for observability (agent + workflow lifecycle).

Design goals:
- Resource efficiency (shared MCP connections).
- Explicit, typed plan & task structures (no opaque blobs).
- Minimal dependencies; small surface exported via `src/index.ts`.

## Architecture Overview
- Core domains live under `src/`:
  - `agent/`: Agent runtime (tool orchestration, tool calling loop, event emission via `agent:lifecycle`). See `agent/index.ts`.
  - `mcp/`: MCP connection + tool aggregation (`mcpConnectionManager`, `mcpServerAggregator`). Single global connection manager; each agent has an aggregator with just its tools.
  - `llm/`: LLM abstraction layer (interface + Fireworks implementation in `llmFireworks.ts`). Agents always call through `LLMInterface`.
  - `workflows/`: Higher‑order multi-agent coordination (current: `orchestrator`). Breaks objectives into steps & tasks and invokes underlying agents.
  - `memory/`: Simple in‑memory message history (`SimpleMemory`). No persistence layer.
  - `tools/`: Local function tool type definitions (MCP server tools are discovered dynamically via aggregator).
  - `logger/`: Central logger singleton (`Logger.getInstance()`).
- Data flow (Orchestrator workflow): Objective -> planning LLM -> structured plan -> for each step -> for each task -> delegate to agent -> agent may call tools (MCP or local) -> results accumulated -> synthesizer agent produces final result.
- Events: Agents emit `agent:lifecycle`; Orchestrator emits unified `workflow:lifecycle` events (wrapper around `WORKFLOW_EVENTS`). Consumers subscribe via `agent.onAgentEvent()` or `orchestrator.onWorkflowEvent()`.

## Key Types & Contracts
- Plan types in `workflows/orchestrator/types.ts` define shape expected from planner LLM (`PlanResult` with nested `PlanStepResult` and `PlanTaskResult`).
- LLM output for planning uses `fullPlanSchemaResponseFormat` (JSON schema) with `generateStructuredResult()`.
- Tools exposed to the LLM must serialize to OpenAI function tool schema: `{ type: 'function', function: { name, description, parameters } }`.
- Event payloads (see `workflows/events.ts`, `agent/events.ts`). Always include `timestamp` + `workflowId` (workflow) or `agentName` (agent) when emitted.

## Patterns & Conventions
- All modules use ES modules (`"type": "module"` in `package.json`). Import paths are relative within `src`.
- Logger usage: prefer `this.logger.info()` for status; errors are thrown—no silent failures.
- Agents: Use `Agent.initialize` when serverConfigs present (boot MCP aggregator). Use `new Agent` only for pure local / workflow-only roles (e.g., planner, synthesizer inside Orchestrator).
- Memory: Append user then assistant messages; final assistant message extracted via `generateStr()`.
- Event emitters: Local lightweight implementation (`eventEmitter.ts`). Signature: `emit(eventName: string, payload)` / `on(eventName, listener)`. Always include correct event name string.
- Do not mutate plan/task structures outside the orchestrated loop except to attach `result` fields.

## Adding / Modifying Functionality
- Adding a new workflow: Place under `src/workflows/<name>/`. Export through `src/index.ts` if public. Reuse the event model (`<name>:lifecycle`) mirroring orchestrator pattern.
- Adding new tools:
  1. Local: Implement `FunctionToolInterface` (name, description, parameters (Zod/OpenAPI-like JSON schema), `execute(args)` returning serializable object).
  2. MCP server: Add a `ServerConfig` entry (see README examples). The connection manager ensures single instance.
- Adding new LLM provider: Implement `LLMInterface` (generate). Keep provider-specific config isolated; export a factory class like `LLMFireworks`.
- Extending events: Update the union in `workflows/events.ts` or `agent/events.ts`; ensure the Orchestrator/Agent emitters fill required fields; update re-exports in `src/index.ts`.

## Typical Workflows
- Build: `pnpm install` then `pnpm run build` (runs `tsc`). Output goes to `dist/` (only directory published per `files` in `package.json`).
- Demo (standalone): `node --loader ts-node/esm ./demo/standalone/index.ts` (see README). Requires env vars for external APIs.
- Express demo: Inside `demo/express/`: `npm run dev` (nodemon/ts-node), `npm run build`, `npm start`.
- No test suite yet—avoid introducing testing frameworks silently. If adding tests, clarify structure first.

## Error Handling & Edge Cases
- Tool failure: If tool returns empty content, emits `AGENT_ERROR` and throws—maintain this pattern.
- Missing agent in Orchestrator task: throws with clear message and emits workflow error if workflow context active.
- Max iterations: Controlled by `maxIterations` (default 5). Avoid unbounded loops.

## Event Usage Examples
```ts
orchestrator.onWorkflowEvent(evt => {
  switch (evt.type) {
    case WORKFLOW_EVENTS.WORKFLOW_STEP_START:
      // progress UI update
      break;
    case WORKFLOW_EVENTS.WORKFLOW_TASK_END:
      // log task result
      break;
  }
});
agent.onAgentEvent(evt => {
  if (evt.action === AGENT_EVENTS.AGENT_TOOL_CALL) {
    // audit
  }
});
```

## Export Surface
Public exports in `src/index.ts` define the intended API. Avoid deep imports (`src/...`) in external code; update index on new public modules.

## Things NOT Present (avoid assumptions)
- No persistence layer (memory is volatile).
- No queue/job system.
- No generic plugin loader beyond MCP tool aggregation.
- No test infra yet.

## When Editing
- Preserve existing event names & payload shapes.
- Keep TypeScript strictness: ensure newly added event fields propagate through unions.
- Prefer small, focused files; follow existing naming (camelCase files except enums/types).
