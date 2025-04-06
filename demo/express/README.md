# MCP Agent Express Demo

A demo Express.js application showcasing MCP Agent integration with a REST API server. This demo demonstrates how to integrate MCP's multi-agent orchestration capabilities within an Express.js application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
EXA_API_KEY=your_api_key_here
PORT=3000 # optional
```

3. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Build TypeScript files
npm run build

# Production mode (requires build first)
npm start
```

## Project Structure
```
src/
├── router/        # API route handlers with MCP agent implementations
├── types/         # TypeScript type definitions
└── index.ts       # Main application with MCP Agent setup
```

## MCP Integration
```typescript
import { App, Orchestrator, Agent, LLMFireworks, ServerConfig } from 'mcp-agent';

// Initialize MCP connection
const mcpApp = new App();
const app = express();

 app.get('/api/generate_blog_post', async (req: Request, res: Response) => {
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
      llm,
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

// Graceful shutdown handling
app.on('close', () => {
  // close MCP connection gracefully
  mcpApp.close();
});
```

## API Endpoints

### Blog Post Generation
- `GET /api/generate_blog_post?topic=your_topic` - Generates a blog post using multi-agent orchestration
  - Uses a researcher agent to gather information
  - Uses an editor agent to refine and improve the content
  - Returns the generated blog post content

## Example Usage

```bash
# Check health and MCP Agent status
curl http://localhost:3000/api/health

# Generate a blog post about AI
curl "http://localhost:3000/api/generate_blog_post?topic=artificial%20intelligence"
```

## Key Features

1. **MCP Agent Lifecycle Management**
   - Initializes MCP Agent connection on server startup
   - Maintains persistent connection throughout server lifecycle
   - Gracefully closes MCP connection on server shutdown

2. **Multi-Agent Orchestration**
   - Researcher agent for information gathering
   - Editor agent for content refinement
   - Orchestrator for managing agent interactions

3. **LLM Integration**
   - Uses Fireworks LLM model
   - Configurable parameters (tokens, temperature)
   - Integrated with agent workflows

## Important Notes

1. Ensure `EXA_API_KEY` is properly configured in your environment
2. The MCP Agent connection is initialized at server startup
3. All API endpoints are available under the `/api` prefix
4. Agents are initialized per request in the blog post generation endpoint 