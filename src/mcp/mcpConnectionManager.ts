import { Client } from '@modelcontextprotocol/sdk/client/index';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js"
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { type ServerConfig } from './types';

class MCPConnectionManager {
  private static instance: MCPConnectionManager;
  private runningServers: Map<string, Client> = new Map();
  private maxReconnectAttempts: number = 2;
  private reconnectDelay: number = 1000; // 1 second

  public static getInstance(): MCPConnectionManager {
    if (!MCPConnectionManager.instance) {
      MCPConnectionManager.instance = new MCPConnectionManager();
    }
    return MCPConnectionManager.instance;
  }

  async launchServer(id: string, config: ServerConfig): Promise<Client> {

    // if the server is already running, return the client
    if (this.runningServers.has(id)) {
      return this.runningServers.get(id) as Client;
    }

    // Create appropriate transport
    let transport;
    switch (config.type) {
      case 'stdio':
        // how can we run this as child process?
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args || []
        });
        break;
      case "ws":
        const wsUrl = config.url instanceof URL ? config.url : new URL(config.url);
        // NOTE: ws transport requires node >= 21.0.0
        transport = new WebSocketClientTransport(wsUrl);
        break;
      case 'sse':
        const sseUrl = config.url instanceof URL ? config.url : new URL(config.url);
        transport = new SSEClientTransport(sseUrl);
        break;
    }

    // this  might throw error but to satisfy typescript we need to cast to Client
    const client = await this.connectClient(id, transport) as Client;

    // Store the connection
    this.runningServers.set(id, client);

    return client;
  }

  private async connectClient(id: string, transport: Transport, connectAttempts: number = 0): Promise<Client | void> {
    try {
      // Create a new client
      const client = new Client(
        { name: `multi-server-client-${id}`, version: '1.0.0' },
        { capabilities: { tools: {}, resources: {}, prompts: {} } }
      );
      // Connect and initialize
      await client.connect(transport);
      console.log(`Connected to server: ${id}`);
      return client;
    } catch (error) {
      if (connectAttempts >= this.maxReconnectAttempts) {
        console.error(`Max reconnection attempts reached for server ${id}`);
        throw error;
      }

      const delay = this.reconnectDelay * Math.pow(2, connectAttempts - 1); // Exponential backoff
      console.log(`Attempting to reconnect to server ${id} (attempt ${connectAttempts + 1}) in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.connectClient(id, transport, connectAttempts + 1);
    }
  }

  getClient(id: string): Client | undefined {
    return this.runningServers.get(id);
  }

  getAllClients(): Client[] {
    return Array.from(this.runningServers.values());
  }

  async disconnectServer(id: string): Promise<void> {
    const client = this.runningServers.get(id);
    if (!client) {
      console.log(`Server ${id} not found or already disconnected`);
      return;
    }

    try {
      await client.close();
      this.runningServers.delete(id);
      console.log(`Disconnected from server: ${id}`);
    } catch (error) {
      console.error(`Error disconnecting from server ${id}:`, error);
    }
  }

  async disconnectAll(): Promise<void> {
    const disconnections = Array.from(this.runningServers.entries()).map(async ([id, client]) => {
      try {
        await client.close();
        console.log(`Disconnected from server: ${id}`);
      } catch (error) {
        console.error(`Error disconnecting from server ${id}:`, error);
      }
    });

    await Promise.all(disconnections);
    this.runningServers.clear();
  }

  // Get all available tools across all servers
  async getAllTools(): Promise<{ serverId: string, tools: any[] }[]> {
    const results = await Promise.all(
      Array.from(this.runningServers.entries()).map(async ([id, client]) => {
        try {
          const tools = await client.listTools();
          return { serverId: id, tools: tools.tools };
        } catch (error) {
          console.error(`Error getting tools from server ${id}:`, error);
          return { serverId: id, tools: [] };
        }
      })
    );

    return results;
  }
}

export default MCPConnectionManager