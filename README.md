# mcp-agent

### Usage
```js
const llm = new LLMFireworks("accounts/fireworks/models/deepseek-v3", {
  maxTokens: 2048,
  temperature: 0.1
})

const researcher = await Agent.initialize({
  name: "researcher",
  description: `Your expertise is to find information.`,
  serverNames: ['search_web'], // mcp server support both (local and servers available in the web)
});

const writer = await Agent.initialize({
  name: "writer",
  description: `Your expertise is to write information to a file.`,
  functions: [writeLocalSystem], // local tool
  llm,
});


const orchestrator = new Orchestrator({
  llm,
  agents: [researcher, writer],
})

const result = await orchestrator.generate('Search new latest developemnt about AI and write about it to `theory_on_ai.md` on my local machine. no need to verify the result.');
console.log(result)
```
