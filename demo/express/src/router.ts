import express, { Request, Response } from 'express';
import { Orchestrator, Agent, LLMFireworks, ServerConfig } from '../../../src/';


function createRouter() {
  const router = express.Router();

  router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  router.get('/generate_blog_post', async (req: Request, res: Response) => {
    const { topic } = req.query as { topic: string };
    const llm = new LLMFireworks("accounts/fireworks/models/deepseek-v3", {
      maxTokens: 2048,
      temperature: 0.1,
      stream: true
    })

    const exaServerConfig: ServerConfig = {
      name: "search_web",
      type: "http",
      url: getSmitheryUrl()
    }

    const researcher = await Agent.initialize({
      name: "researcher",
      description: `Your expertise is to find information in the web`,
      serverConfigs: [exaServerConfig],
      llm,
    });

    const editor = await Agent.initialize({
      name: "editor",
      description: `Your expertise is to review the information and make it more comprehensive.`,
      serverConfigs: [exaServerConfig],
      llm,
    });

    const orchestrator = new Orchestrator({
      llm,
      agents: [researcher, editor],
    })

    const result = await orchestrator.generate(`Create comprehensive blog post releated to the topic: ${topic}`);

    res.json({ content: result });
  });

  return router;
}

function getSmitheryUrl() {
  const url = new URL("https://server.smithery.ai/exa/mcp")
  url.searchParams.set("api_key", process.env.SMITHERY_KEY as string)
  url.searchParams.set("profile", process.env.SMITHERY_PROFILE as string)
  return url.toString()
}

export default createRouter;