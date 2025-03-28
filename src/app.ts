import MCPConnectionManager from "./mcp/mcpConnectionManager";

/**
 * Persistent MCP connection throught the app lifecycle
 */
export class App {
  private mcpConnectionManager: MCPConnectionManager;

  constructor() {
    this.mcpConnectionManager = MCPConnectionManager.getInstance();
  }

  close() {
    this.mcpConnectionManager.disconnectAll();
  }
}