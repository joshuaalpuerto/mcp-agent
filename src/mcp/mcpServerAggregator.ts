import { Client } from '@modelcontextprotocol/sdk/client/index';
import MCPConnectionManager from './mcpConnectionManager';
import { getAvailableServers } from './servers/availableServers';
import { CallToolResult, Tool } from '../tools/types';

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
  private serverNames: string[];
  private connectionManager: MCPConnectionManager;

  constructor({ serverNames }: { serverNames: string[] }) {
    this.serverNames = serverNames;
    this.connectionManager = MCPConnectionManager.getInstance();
  }

  static async load(serverNames: string[]): Promise<MCPServerAggregator> {
    const mcpServeAggregator = new MCPServerAggregator({ serverNames });
    await mcpServeAggregator.loadServers();
    return mcpServeAggregator;
  }

  async loadServers(): Promise<void> {
    const availableServers = getAvailableServers();
    for (const serverName of this.serverNames) {
      try {
        const serverConfig = availableServers.find(server => server.name === serverName);
        if (!serverConfig) {
          throw new Error(`Server ${serverName} not found`);
        }

        const client = await this.connectionManager.launchServer(serverName, serverConfig);

        const tools = await client.listTools();

        // Store server information
        this.servers.set(serverName, {
          client,
          config: serverConfig,
          capabilities: {
            tools: tools.tools,
          }
        });
      } catch (error) {
        console.error(`Error adding server"${serverName}":`, error);
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