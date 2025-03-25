import { Agent } from './agent';
import { LLMFireworks } from './llm/llmFireworks';
import { writeLocalSystem } from './tools/writeLocalSystem';
import { Orchestrator } from './workflows/orchestrator/orchestrator';
// Example usage:
// Example usage
async function runOrchestrator() {
  const llm = new LLMFireworks("accounts/fireworks/models/deepseek-v3", {
    maxTokens: 2048,
    temperature: 0.1
  })

  const researcher = await Agent.initialize({
    name: "researcher",
    description: `Your expertise is to find information.`,
    serverNames: ['search_web'],
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

  const result3 = await orchestrator.generate('Search new latest developemnt about AI and write about it to `theory_on_ai.md` on my local machine. no need to verify the result.');
  console.log(JSON.stringify(result3))

  await researcher.close()
  await writer.close()
}

runOrchestrator().catch(console.error);