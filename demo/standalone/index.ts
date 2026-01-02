
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { RunLedgerAgent, LLMFireworks, Orchestrator, Logger, WorkflowLifecycleEvent, LogLevel, SimpleMemory, WORKFLOW_EVENTS } from '../../src';
import { writeLocalSystem } from '../tools/writeLocalSystem';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runOrchestrator() {
  const logger = Logger.getInstance(console, { level: LogLevel.ERROR });
  const llm = new LLMFireworks("accounts/fireworks/models/deepseek-v3p2", {
    maxTokens: 2048,
    temperature: 0.1,
    stream: true
  })

  const researcher = await RunLedgerAgent.initialize({
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

  const writer = await RunLedgerAgent.initialize({
    name: "writer",
    description: `Your expertise is to write information to a file.`,
    functions: [writeLocalSystem],
    llm,
  });

  const history = SimpleMemory.fromMessages([
    {
      role: 'user', content: 'Search new latest development about AI and write about it to `theory_on_ai.md` on my local machine. no need to verify the result. Also no need to use deep_researcher_start.'
    },
    {
      role: 'assistant', content: `### Synthesis of Latest AI Developments\n\nThe latest advancements in AI, particularly in 2023, have been marked by significant breakthroughs and growing adoption across various sectors. Here’s a cohesive summary of the key developments:\n\n1. **Generative AI's Explosive Growth**  \n   Generative AI tools have seen unprecedented adoption, with one-third of organizations integrating them into at least one business function. This surge has prompted 40% of organizations to plan increased AI investments. However, challenges like inaccuracy and ethical concerns remain prevalent, necessitating robust mitigation strategies.\n\n2. **Impact Across Industries**  \n   Generative AI has made substantial inroads into healthcare, education, and creative arts, transforming traditional practices and workflows. Despite its potential, the technology has raised significant concerns regarding transparency, bias, and ethical implications, leading to calls for stricter regulations.\n\n3. **Major Tech Advancements**  \n   Google and DeepMind have been at the forefront of AI innovation, launching advanced models like Bard and PaLM 2. These models have enhanced multilingual capabilities and reasoning tasks, showcasing AI's potential in both creative and practical applications. Additionally, Google has integrated generative AI tools into various products, further embedding AI into everyday use.\n\n4. **Generative AI in the Real World**  \n   Generative AI has transitioned from research labs to real-world applications, with major tech companies releasing models like GPT-4, LLaMA 2, and Gemini. While these models have generated significant hype, no single application has yet achieved overnight success. The focus has shifted towards responsible AI development, emphasizing ethical considerations and long-term impact.\n\n5. **AI in Urban Planning**  \n   AI has demonstrated its potential in optimizing complex tasks, such as urban planning. An AI system developed by Tsinghua University outperformed human experts in creating urban designs, highlighting AI's ability to enhance efficiency and innovation in traditionally human-dominated fields.\n\n### Conclusion\nThe year 2023 has been a landmark year for AI, particularly in the realm of generative models. The technology has not only advanced significantly but has also begun to permeate various industries, driving innovation and efficiency. However, the rapid evolution of AI has also underscored the need for ethical considerations and responsible deployment to mitigate risks and ensure sustainable growth. These developments have been documented in the file 'theory_on_ai.md' on your local machine for further reference.`
    }
  ])

  const orchestrator = new Orchestrator({
    llm,
    logger,
    agents: [researcher, writer],
    history
  })

  orchestrator.onWorkflowEvent((event: WorkflowLifecycleEvent) => {
    console.log(event)

    if (event.type === WORKFLOW_EVENTS.WORKFLOW_END) {
      console.log('Workflow completed with result:', event.result);
    }
  })


  await orchestrator.generate('Base on this information what is the best way to learn?');

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