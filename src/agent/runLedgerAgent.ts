
import { Agent, AgentConfig } from './index';
import MCPServerAggregator from '../mcp/mcpServerAggregator';

export class RunLedgerAgent extends Agent {

  static async initialize(config: AgentConfig) {
    // if we have server names then initialize Agent with MCP
    if (config.serverConfigs?.length) {
      const aggregator = await MCPServerAggregator.load(config.serverConfigs);
      const agent = new RunLedgerAgent({ ...config, aggregator });

      return agent
    }

    return new RunLedgerAgent(config);
  }

  protected async callTool(toolName: string, args: any): Promise<any> {
    // CALL to mcp tool you can conditionally trigger it or call your recoding etc.
    const result = await super.callTool(toolName, args);

    console.log(JSON.stringify({
      tool: toolName,
      args: args,
      ok: true,
      result: result
    }))

    return result;
  }
}