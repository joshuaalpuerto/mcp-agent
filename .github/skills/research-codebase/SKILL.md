---
name: research-codebase
description: Conducts structured research across a codebase to answer questions about architecture, components, and data flow. Use when investigating how code works, where functionality lives, or how systems interact. Decomposes questions, runs parallel investigations, synthesizes findings with file:line references, and produces persistent research documents.
---

# Skill: Codebase Research

A systematic methodology for investigating and documenting codebases. Use this skill whenever you need to answer questions about how a codebase works, where functionality lives, or how components interact.

---

## Core Principle

**You are a documentarian, not a critic.**

- Document what IS, not what SHOULD BE.
- Describe what exists, where it exists, how it works, and how components interact.
- Do NOT suggest improvements, critique implementations, or propose changes unless explicitly asked.
- Do NOT perform root cause analysis or identify problems unless explicitly asked.
- Your output is a technical map of the existing system.

---

## Research Methodology

### Phase 1: Absorb Context

Before any investigation, read and internalize everything the user provides directly.

1. **Read mentioned files fully** — tickets, docs, JSON schemas, config files, etc.
2. **Read them yourself in your main context** before delegating any work. This ensures you decompose the question correctly.
3. **Identify the real question** — users sometimes ask surface-level questions with deeper underlying needs. Think about what patterns, connections, or architectural knowledge they actually seek.

### Phase 2: Decompose the Research Question

Break the query into independent, composable research areas. Good decomposition is the most important step.

**Decomposition strategies:**

| Question Type | Decomposition Approach |
|---|---|
| "How does X work?" | Entry points → core logic → data flow → side effects |
| "Where is X?" | File locations → directory structure → import graph |
| "How do X and Y interact?" | X's interface → Y's interface → connection points → data exchange |
| "What does the system do when...?" | Trigger → handler chain → state changes → outputs |

**For each research area, determine:**
- What files or directories are likely relevant
- What search terms (function names, types, imports) would locate them
- Whether this area depends on another area's findings or can run in parallel

### Phase 3: Delegate to Sub-Agents in Parallel

**Do NOT perform deep file reading or analysis yourself.** Your role as the main agent is to decompose, delegate, and synthesize. Spawn sub-agents to do the actual investigation work concurrently.

#### Sub-Agent Delegation Model

Use `runSubagent` to spawn specialized agents for each research area. Each sub-agent handles one focused investigation and returns structured findings.

**Available specialist agents:**

| Agent | Definition File | Role |
|---|---|---|
| **code-locator** | `.github/agents/code-locator.agent.md` | Find WHERE files and components live. A "super grep/glob/ls" — use it when you need to locate files by topic, keyword, or feature. |
| **code-analyzer** | `.github/agents/code-analyzer.agent.md` | Understand HOW specific code works. Reads files, traces data flow, documents implementation details with file:line references. |
| **code-pattern-finder** | `.github/agents/code-pattern-finder.agent.md` | Find WHAT conventions and patterns are used. Locates similar implementations, extracts reusable patterns, shows concrete code examples. |

#### How to Spawn Sub-Agents

When calling `runSubagent`:
1. **Include the agent definition file path** in the instruction text (e.g., "First read `.github/agents/code-locator.agent.md` to understand your role.")
2. **Instruct the sub-agent to read that file first** using `read_file` so it understands its role and constraints.
3. **Give a focused, specific prompt** — tell it WHAT to find, not HOW to search (agents already know their search strategies).
4. **Remind every sub-agent**: "You are a documentarian, not an evaluator. Describe what exists without suggesting improvements."

#### Investigation Strategy

**Step 1 — Location discovery (parallel):**
Spawn **code-locator** agents to find where relevant files live. Launch multiple locators simultaneously when searching for different features or components.

```
Example: For "How does the orchestrator workflow work?"
- Locator A: "Find all files related to the orchestrator workflow"
- Locator B: "Find all event definitions and emission points"
```

**Step 2 — Deep analysis (parallel, after locations are known):**
Once locators return, spawn **code-analyzer** agents on the most relevant files to trace implementation details and data flow.

```
Example: Based on locator results:
- Analyzer A: "Analyze orchestrator.ts — trace the planning and execution loop"
- Analyzer B: "Analyze the event system — how workflow events are emitted and consumed"
```

**Step 3 — Pattern discovery (parallel, as needed):**
Spawn **code-pattern-finder** agents when the question involves understanding conventions or finding similar implementations.

```
Example: "Find all patterns for how agents call tools in the codebase"
```

#### Parallel Delegation Rules
- Launch all independent sub-agents simultaneously — do not wait for one before starting another
- Start with locator agents, then spawn analyzers on the results
- Never block one sub-agent on another unless there is a true data dependency
- Each sub-agent must be self-contained and return structured findings
- **WAIT for ALL sub-agents to complete** before moving to Phase 4 (synthesis)
- Keep yourself (the main agent) focused on orchestration, not deep file reading

### Phase 4: Synthesize Findings

After all investigations complete:

1. **Compile results** from all parallel investigations
2. **Prioritize live code** as the primary source of truth over documentation or historical artifacts
3. **Connect findings** across components — map how systems interact and data flows between them
4. **Resolve conflicts** — if different investigations found contradictory information, re-read the source to determine what's accurate
5. **Fill gaps** — identify areas where investigations didn't yield results and run targeted follow-up searches
6. **Answer the specific question** with concrete evidence (file paths, line numbers, code references)

---

## Research Output Format

Structure research findings consistently for maximum utility.

### For Inline Answers (conversational)

Provide:
- A concise summary answering the question
- Key file paths with line numbers as links
- Architecture/data flow description where relevant
- Code snippets only when they clarify the answer

### For Research Documents (persistent artifacts)

Save to `tasks/YYYY-MM-DD-<topic-description>/research.md` with this structure:

```markdown
---
date: [ISO 8601 datetime with timezone]
researcher: [Agent/researcher identifier]
git_commit: [Current commit hash]
branch: [Current branch name]
repository: [Repository name]
topic: "[Research question]"
tags: [research, codebase, component-names]
status: complete
last_updated: [YYYY-MM-DD]
last_updated_by: [Agent/researcher identifier]
---

# Research: [Question/Topic]

**Date**: [Datetime with timezone]
**Researcher**: [Identifier]
**Git Commit**: [Hash]
**Branch**: [Branch]
**Repository**: [Repository]

## Research Question
[Original query]

## Summary
[High-level answer describing what was found]

## Detailed Findings

### [Component/Area 1]
- What exists (file:line references)
- How it connects to other components
- Implementation details

### [Component/Area 2]
...

## Code References
- `path/to/file.ts:123` - Description
- `path/to/file.ts:45-67` - Description

## Architecture Documentation
[Patterns, conventions, and design implementations found]

## Historical Context
[Relevant insights from tasks/ or other historical directories]

## Open Questions
[Areas needing further investigation]
```

### For Follow-up Research

When appending to an existing research document:
- Update `last_updated` and `last_updated_by` in frontmatter
- Add `last_updated_note: "Added follow-up research for [description]"` to frontmatter
- Append a new `## Follow-up Research [timestamp]` section
- Run fresh investigations — do not reuse stale findings

---

## Search Strategy Reference

### Effective Search Patterns

**By code role:**
- Business logic: `*service*`, `*handler*`, `*controller*`, `*processor*`
- Data models: `*model*`, `*schema*`, `*entity*`, `*types*`
- Configuration: `*.config.*`, `*rc*`, `*.env*`
- Tests: `*test*`, `*spec*`, `__tests__/`
- Types/interfaces: `*.d.ts`, `*types*`, `*interfaces*`

**By language ecosystem:**
- TypeScript/JavaScript: `src/`, `lib/`, `components/`, `pages/`, `api/`, `utils/`
- Python: `src/`, `lib/`, `pkg/`, module directories
- Go: `pkg/`, `internal/`, `cmd/`

**By relationship:**
- Imports/requires of a specific module
- Implementations of a specific interface
- Callers of a specific function
- Event emitters and listeners for a specific event name

### Search Efficiency Rules

1. Use regex with alternation (`word1|word2|word3`) to search for multiple terms in one pass
2. Use glob patterns to scope searches to relevant directories
3. Read larger file ranges over many small reads
4. When uncertain about naming, use semantic search first, then refine with exact text search
5. Batch independent read operations together

---

## Quality Checklist

Before delivering research findings, verify:

- [ ] Every claim is backed by a specific file path and line number
- [ ] Data flow is traced end-to-end, not just entry points
- [ ] Cross-component interactions are documented
- [ ] All file paths are verified to exist (not guessed)
- [ ] The original question is directly and fully answered
- [ ] No evaluative language — no "should", "better", "problem", "issue" (unless quoting code comments)
- [ ] No placeholder values in research documents — all metadata is real

---

## Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|---|---|
| Reading one file at a time sequentially | Batch independent file reads in parallel |
| Searching for one term at a time | Use regex alternation for related terms |
| Guessing file paths without verifying | Always search or list directories first |
| Providing analysis without file:line refs | Every finding must link to source code |
| Mixing documentation with recommendations | Describe only; flag recommendations explicitly if asked |
| Starting to write before all data is gathered | Complete all investigations before synthesizing |
| Relying on documentation over source code | Source code is truth; docs supplement |
| Over-reading entire files when a section suffices | Target reads to relevant line ranges |
| Running dependent investigations in parallel | Sequence investigations that depend on prior results |
