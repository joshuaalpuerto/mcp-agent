
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { Agent, LLMFireworks, Orchestrator, Logger, LogLevel } from '../../src';
import { writeLocalSystem } from '../tools/writeLocalSystem';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runOrchestrator() {
  const logger = Logger.getInstance(console, { level: LogLevel.ERROR });
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
        name: "search_web",
        type: "http",
        url: getSmitheryUrl()
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
    logger,
    agents: [researcher, writer],
  })

  const result = await orchestrator.generate('Search new latest developemnt about AI and write about it to `theory_on_ai.md` on my local machine. no need to verify the result.');
  console.log(JSON.stringify(result))

  await researcher.close()
  await writer.close()
}

function getSmitheryUrl() {
  const url = new URL("https://server.smithery.ai/exa/mcp")
  url.searchParams.set("api_key", process.env.SMITHERY_KEY as string)
  url.searchParams.set("profile", process.env.SMITHERY_PROFILE as string)
  return url.toString()
}

runOrchestrator().catch(console.error);