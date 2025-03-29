
import { createSmitheryUrl } from "@smithery/sdk/config"
import { fileURLToPath } from 'url';
import path from 'path';
import { Agent, LLMFireworks, Orchestrator } from '../../src';
import { writeLocalSystem } from '../tools/writeLocalSystem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runOrchestrator() {
  const llm = new LLMFireworks("accounts/fireworks/models/deepseek-v3", {
    maxTokens: 2048,
    temperature: 0.1,
    stream: true
  })

  const researcher = await Agent.initialize({
    llm,
    name: "researcher",
    description: `Your expertise is to find information.`,
    serverConfigs: [
      {
        name: "read_file_from_local_file_system",
        type: "stdio",
        command: "node",
        args: ['--loader', 'ts-node/esm', path.resolve(__dirname, '..', 'servers', 'readLocalFileSystem.ts'),]
      },
      {
        name: "exa-mcp-server",
        type: "stdio",
        command: "exa-mcp-server",
      }
    ],
  });

  const writer = await Agent.initialize({
    name: "writer",
    description: `Your expertise is to write information to a file.`,
    functions: [writeLocalSystem],
    llm,
  });

  const orchestrator = new Orchestrator({
    llm,
    agents: [researcher, writer],
  })

  const result = await orchestrator.generate('Search new latest developemnt about AI and write about it to `theory_on_ai.md` on my local machine. no need to verify the result.');
  console.log(JSON.stringify(result))

  await researcher.close()
  await writer.close()
}

runOrchestrator().catch(console.error);