# mcp-agent

**Build Effective Agents with Model Context Protocol in TypeScript**

**mcp-agent** is a TypeScript framework inspired by the Python [lastmile-ai/mcp-agent](https://github.com/lastmile-ai/mcp-agent) project. It provides a simple, composable, and type-safe way to build AI agents leveraging the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) in JavaScript and TypeScript environments.

This library aims to bring the powerful patterns and architecture of `mcp-agent` to the JavaScript ecosystem, enabling developers to create robust and controllable AI agents that can interact with MCP-aware services and tools.

## Installation

```bash
npm install @joshuaalpuerto/mcp-agent@1.0.0
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

Get started quickly with a basic example:

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

**To run this example:**

1.  **Install Dependencies:**
    ```bash
    pnpm install
    ```
2.  **Set Environment Variables:** Create a `.env` file (or set environment variables directly) and add your API keys (e.g., `EXA_API_KEY`, Fireworks AI API key if needed).
3.  **Run the Demo:**
    ```bash
    pnpm build && node --loader ts-node/esm ./demo/index.ts
    ```

## Core Concepts

*   **Agent:** The fundamental building block. An `Agent` is an autonomous entity with a specific role, instructions, and access to tools.
*   **MCP Server Aggregator (`MCPServerAggregator`):** Manages connections to multiple MCP servers, providing a unified interface for agents to access tools.
*   **MCP Connection Manager (`MCPConnectionManager`):** Handles the lifecycle and reuse of MCP server connections, optimizing resource usage.
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

## Acknowledgements

This project is heavily inspired by and builds upon the concepts and architecture of the excellent [lastmile-ai/mcp-agent](https://github.com/lastmile-ai/mcp-agent) Python framework

We encourage you to explore their repository for a deeper understanding of the underlying principles and patterns that have informed this TypeScript implementation.

## Contributing

Contributions are welcome!

