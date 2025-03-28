import express, { Request, Response } from 'express';
import { createSmitheryUrl } from "@smithery/sdk/config"
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
      temperature: 0.1
    })

    const exaServerConfig: ServerConfig = {
      name: "search_web",
      type: "ws",
      url: createSmitheryUrl(
        "https://server.smithery.ai/exa/ws",
        {
          exaApiKey: process.env.EXA_API_KEY
        }
      )
    }

    const researcher = await Agent.initialize({
      name: "researcher",
      description: `Your expertise is to find information in the web`,
      serverConfigs: [exaServerConfig],
    });

    const editor = await Agent.initialize({
      name: "editor",
      description: `Your expertise to review the information and make it more comprehensive.`,
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

export default createRouter;