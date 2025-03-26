import { Client } from '@modelcontextprotocol/sdk/client/index';
import MCPConnectionManager from './mcpConnectionManager';
import { CallToolResult, Tool } from '../tools/types';
import { ServerConfig } from './types';
// It's called aggregator because it's aggregating tools from multiple servers
// agent has 1:1 connection with aggregator
class MCPServerAggregator {
  private servers: Map<string, {
    client: Client,
    config: any,
    capabilities: {
      tools: any[],
    }
  }> = new Map();
  private serverConfigs: ServerConfig[];
  private connectionManager: MCPConnectionManager;

  constructor({ serverConfigs }: { serverConfigs: ServerConfig[] }) {
    this.serverConfigs = serverConfigs;
    this.connectionManager = MCPConnectionManager.getInstance();
  }

  static async load(serverConfigs: ServerConfig[]): Promise<MCPServerAggregator> {
    const mcpServeAggregator = new MCPServerAggregator({ serverConfigs });
    await mcpServeAggregator.loadServers();
    return mcpServeAggregator;
  }

  async loadServers(): Promise<void> {
    for (const serverConfig of this.serverConfigs) {
      try {
        const client = await this.connectionManager.launchServer(serverConfig.name, serverConfig);

        const tools = await client.listTools();

        // Store server information
        this.servers.set(serverConfig.name, {
          client,
          config: serverConfig,
          capabilities: {
            tools: tools.tools,
          }
        });
      } catch (error) {
        console.error(error)
        throw new Error(`Error adding server "${serverConfig.name}": ${error}`);
      }
    }
  }

  // Get all tools across all servers
  getAllTools(): { id: string, tool: Tool }[] {
    const allTools: { id: string, tool: Tool }[] = [];
    for (const [id, server] of this.servers.entries()) {
      for (const tool of server.capabilities.tools) {
        allTools.push({
          id: id, tool: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          }
        });
      }
    }

    return allTools;
  }

  // Find a specific tool across all servers
  findTool(toolName: string): { id: string, tool: Tool } | null {
    const tool = this.getAllTools().find(t => t.tool.name === toolName);
    if (tool) return tool;
    return null;
  }

  // Execute a tool on the appropriate server
  async executeTool(toolName: string, args: any): Promise<CallToolResult> {
    const toolInfo = this.findTool(toolName);
    if (!toolInfo) {
      throw new Error(`Tool ${toolName} not found on any server`);
    }

    const client = this.connectionManager.getClient(toolInfo.id);
    if (!client) {
      throw new Error(`Client for server ${toolInfo.id} not found`);
    }

    console.log(`Executing tool ${toolName} on server ${toolInfo.id}`);
    return await client.callTool({ name: toolName, arguments: args });
  }

  async close(): Promise<void> {
    const closePromises = Array.from(this.servers.entries()).map(async ([id]) => {
      try {
        await this.connectionManager.disconnectServer(id);
      } catch (error) {
        console.error(`Error closing server ${id}:`, error);
      }
    });

    await Promise.all(closePromises);
    this.servers.clear();
  }
}

export default MCPServerAggregator