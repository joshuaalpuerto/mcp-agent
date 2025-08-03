# mcp-agent

**Build Effective Agents with Model Context Protocol in TypeScript**

**mcp-agent** is a TypeScript framework inspired by the Python [lastmile-ai/mcp-agent](https://github.com/lastmile-ai/mcp-agent) project. It provides a simple, composable, and type-safe way to build AI agents leveraging the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) in JavaScript and TypeScript environments.

This library aims to bring the powerful patterns and architecture of `mcp-agent` to the JavaScript ecosystem, enabling developers to create robust and controllable AI agents that can interact with MCP-aware services and tools.

## Installation

First, create or update your `.npmrc` file with:
```
@joshuaalpuerto:registry=https://npm.pkg.github.com
```

Then
```bash
npm install @joshuaalpuerto/mcp-agent
```

## Key Capabilities

**mcp-agent** empowers you to build sophisticated AI agents with the following core capabilities:

*   **Agent Abstraction:** Define intelligent agents with clear instructions, access to tools (both local functions and MCP servers), and integrated LLM capabilities.
*   **Model Context Protocol (MCP) Integration:** Seamlessly connect and interact with services and tools exposed through MCP servers.
*   **Local Function Tools:** Extend agent capabilities with custom, in-process JavaScript/TypeScript functions that act as tools, alongside MCP server-based tools.
*   **LLM Flexibility:** Integrate with various Large Language Models (LLMs). The library includes an example implementation for Fireworks AI, demonstrating extensibility for different LLM providers.
*   **Memory Management:** Basic in-memory message history to enable conversational agents.
*   **Workflows:** Implement complex agent workflows like the `Orchestrator` pattern to break down tasks into steps and coordinate multiple agents. Support for additional patterns from Anthropic's [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) and OpenAI's [Swarm](https://github.com/openai/swarm) coming soon.
*   **TypeScript & Type Safety:** Built with TypeScript, providing strong typing, improved code maintainability, and enhanced developer experience.

## Quick Start

### Standalone Usage

Get started quickly with a basic example (Using as standalone):

```js
import { fileURLToPath } from 'url';
import path from 'path';
import { Agent, LLMFireworks, Orchestrator } from 'mcp-agent'; // Import from your library name!
import { writeLocalSystem } from './tools/writeLocalSystem'; // Assuming you have example tools

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runOrchestrator() {
  const llm = new LLMFireworks("accounts/fireworks/models/deepseek-v3", { // Example LLM from Fireworks
    maxTokens: 2048,
    temperature: 0.1
  });

  const researcher = await Agent.initialize({
    llm,
    name: "researcher",
    description: `Your expertise is to find information.`,
    serverConfigs: [ // Example MCP Server Configurations
      {
        name: "read_file_from_local_file_system",
        type: "stdio",
        command: "node",
        args: ['--loader', 'ts-node/esm', path.resolve(__dirname, 'servers', 'readLocalFileSystem.ts'),]
      },
      {
        name: "search_web",
        type: "ws",
        url: createSmitheryUrl( // Example using community mcp server via @smithery/sdk
          "https://server.smithery.ai/exa/ws",
          {
            exaApiKey: process.env.EXA_API_KEY
          }
        )
      },
    ],
  });

  const writer = await Agent.initialize({
    llm
    name: "writer",
    description: `Your expertise is to write information to a file.`,
    functions: [writeLocalSystem], // Example local function tool
    llm,
  });

  const orchestrator = new Orchestrator({
    llm,
    agents: [researcher, writer],
  });

  const result = await orchestrator.generate('Search new latest developemnt about AI and write about it to `theory_on_ai.md` on my local machine. no need to verify the result.');
  console.log(JSON.stringify(result));

  await researcher.close();
  await writer.close();
}

runOrchestrator().catch(console.error);
```

https://github.com/user-attachments/assets/122a388b-0dc8-4984-b189-22408a308d7f

**To run this example:**

1.  **Install Dependencies:**
    ```bash
    pnpm install
    ```
2.  **Set Environment Variables:** Create a `.env` file (or set environment variables directly) and add your API keys (e.g., `EXA_API_KEY`, Fireworks AI API key if needed).
3.  **Run the Demo:**
    ```bash
    node --loader ts-node/esm ./demo/standalone/index.ts
    ```

### Rest server Integration
For a complete Express.js integration example with multi-agent orchestration, check out the [demo/express/README.md](./demo/express/README.md).

## Core Concepts

*   **Agent:** The fundamental building block. An `Agent` is an autonomous entity with a specific role, instructions, and access to tools. Agents can invoke tools to perform actions and interact with external services.
*   **MCP Server Aggregator (`MCPServerAggregator`):** Manages the tools available to each individual agent. Each agent has its own aggregator that provides access to the specific tools that agent needs. The aggregator acts as a tool provider for its assigned agent.
*   **MCP Connection Manager (`MCPConnectionManager`):** Central repository that manages the lifecycle and reuse of ALL MCP server connections across the entire application. This is a global collection of all available tools that any agent can potentially use.
    * **Supported Transport**: `stdio`, `sse`, `streamable-http` & `websockets`
*   **LLM Integration (`LLMInterface`, `LLMFireworks`):**  Abstracts interaction with Large Language Models.  `LLMFireworks` is an example implementation for Fireworks AI models.
*   **Tools:**  Functions or MCP server capabilities that Agents can use to perform actions. Tools can be:
    *   **MCP Server Tools:** Capabilities exposed by external MCP servers (e.g., file system access, web search).
    *   **Local Function Tools:**  JavaScript/TypeScript functions defined directly within your application.
*   **Workflows:**  Composable patterns for building complex agent behaviors (see anthropic blog [here](https://www.anthropic.com/research/building-effective-agents)).
    *   **Orchestrator** - workflow demonstrates how to coordinate multiple agents to achieve a larger objective.
    *   **Prompt chaining** - coming soon.
    *   **Routing** - coming soon.
    *   **Parallelization** - coming soon.
    *   **Evaluator-optimizer** - coming soon.
*   **Memory (`SimpleMemory`):**  Provides basic in-memory message history for conversational agents.

## Architecture: Why Connection Manager + Aggregator?

The framework uses a two-layer architecture to efficiently manage MCP server connections:

**Connection Manager (Global):** 
- Maintains a single instance of each MCP server connection across the entire application
- Prevents duplicate server connections when multiple agents need the same tool
- Example: If Agent1 and Agent2 both need a file system tool, only one file system server is spawned

**Aggregator (Per-Agent):**
- Each agent has its own aggregator that provides access to its specific set of tools
- The aggregator references tools from the global connection manager
- Acts as a tool provider interface for its assigned agent

**Benefits:**
- **Resource Efficiency:** Avoid spinning multiple instances of the same MCP server
- **Connection Reuse:** Share server connections across agents when possible
- **Isolation:** Each agent only sees the tools it's configured to use
- **Scalability:** Add new agents without duplicating existing server connections

## Acknowledgements

This project is heavily inspired by and builds upon the concepts and architecture of the excellent [lastmile-ai/mcp-agent](https://github.com/lastmile-ai/mcp-agent) Python framework

We encourage you to explore their repository for a deeper understanding of the underlying principles and patterns that have informed this TypeScript implementation.

## Contributing

Contributions are welcome!

