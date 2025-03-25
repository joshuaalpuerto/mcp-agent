import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type StdioServerConfig = {
  name: string;
  type: 'stdio';
  command: string;
  args: string[];
}

type SSEServerConfig = {
  name: string;
  type: 'sse';
  url: string;
}

type SmitheryServerConfig = {
  name: string;
  type: 'smithery';
  deploymentUrl: string;
  configSchema: any;
}

export type ServerConfig = StdioServerConfig | SmitheryServerConfig | SSEServerConfig

export function getAvailableServers(): ServerConfig[] {
  return [
    {
      name: "read_file_from_local_file_system",
      type: "stdio",
      command: "node",
      args: ['--loader', 'ts-node/esm', path.resolve(__dirname, 'readLocalFileSystem.ts'),]
    },
    {
      name: "search_web",
      type: "stdio",
      command: "node",
      args: ['--loader', 'ts-node/esm', path.resolve(__dirname, 'searchWeb.ts'),]
    },
    {
      name: "@smithery-ai/server-sequential-thinking",
      type: "smithery",
      deploymentUrl: "https://server.smithery.ai/@smithery-ai/server-sequential-thinking",
      configSchema: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "@modelcontextprotocol/sequentialthinking",
      type: "sse",
      url: "https://router.mcp.so/sse/xb0p2om8htummh"
    }
  ]
}