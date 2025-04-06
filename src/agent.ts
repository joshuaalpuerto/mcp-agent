import OpenAI from 'openai';
import MCPServerAggregator from './mcp/mcpServerAggregator';
import { SimpleMemory, Memory } from './memory';
import { LLMConfig, LLMInterface } from './llm/types';
import { FunctionToolInterface } from './tools/types';
import { ServerConfig } from './mcp/types';
interface AgentConfig {
  name: string;
  description: string;
  serverConfigs?: ServerConfig[];
  history?: Memory<OpenAI.ChatCompletionMessageParam>;
  functions?: FunctionToolInterface[];
  llm: LLMInterface;
  maxIterations?: number;
}

export class Agent {
  public name: string;
  public description: string;
  public serverConfigs?: ServerConfig[];
  public functions?: Record<string, FunctionToolInterface>;
  private history: Memory<OpenAI.ChatCompletionMessageParam>;
  private llm: LLMInterface | null;
  private aggregator?: MCPServerAggregator;
  private maxIterations: number;
  private systemPrompt: string;

  constructor(config: AgentConfig & {
    // optional aggregator
    // this is used when agent is used in a workflow that doesn't need to access MCP
    aggregator?: MCPServerAggregator;
  }) {
    this.name = config.name;
    this.description = config.description;
    this.serverConfigs = config.serverConfigs;
    this.llm = config.llm;
    this.maxIterations = config.maxIterations || 5;

    if (config.functions?.length) {
      this.functions = {}
      for (const tool of config.functions) {
        this.functions[tool.name] = tool
      }
    }

    if (config.aggregator) {
      this.aggregator = config.aggregator;
    }

    this.history = config.history || new SimpleMemory<OpenAI.ChatCompletionMessageParam>();
    this.systemPrompt = `You are a ${this.name}. ${this.description} \n\n You have ability to use tools to help you complete the task.`
  }

  static async initialize(config: AgentConfig) {
    // if we have server names then initialize Agent with MCP
    if (config.serverConfigs?.length) {
      const aggregator = await MCPServerAggregator.load(config.serverConfigs);
      const agent = new Agent({ ...config, aggregator });

      return agent
    }

    return new Agent(config);
  }

  public async generate(prompt: string, config?: LLMConfig) {
    if (!this.llm) {
      throw new Error(`Agent: ${this.name} LLM is not initialized`);
    }

    this.history.append({
      role: 'user',
      content: prompt,
    })

    let messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemPrompt },
      ...this.history.get(),
    ]
    let iterations = 0;

    while (iterations < this.maxIterations) {
      const tools = await this.listTools();
      const result = await this.llm.generate({
        messages: messages,
        config: {
          ...config,
          tools
        }
      });

      messages.push({
        role: 'assistant',
        content: result.content,
        tool_calls: result.toolCalls,
      })

      if ((result.finishReason === 'tool_calls' || result.finishReason === 'function_call') && result.toolCalls?.length) {
        for (const toolCall of result.toolCalls) {
          const toolResult = await this.callTool(toolCall.function.name, typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments || {});

          if (!toolResult.content.length) {
            throw new Error(`Tool: ${toolCall.function.name} call failed`);
          }

          messages.push({
            role: 'tool',
            content: JSON.stringify(toolResult) as string,
            tool_call_id: toolCall.id,
          })
        }
      } else {
        // We only care about the actual result from the task
        this.history.append({
          role: 'assistant',
          content: result.content,
        })
        break;
      }

      iterations++;
    }

    return this.history.get();
  }

  public async generateStr(prompt: string, config?: LLMConfig): Promise<string> {
    const result = await this.generate(prompt, config);
    const lastMessage = result[result.length - 1];
    const content = lastMessage.content;
    return content as string;
  }

  public async generateStructuredResult(prompt: string, config?: LLMConfig): Promise<any> {
    const result = await this.generate(prompt, config);
    // get the last message
    const lastMessage = result[result.length - 1];
    return JSON.parse(lastMessage.content as string);
  }


  public async listTools(): Promise<OpenAI.ChatCompletionTool[]> {
    // Get base tools from the aggregator
    let result: OpenAI.ChatCompletionTool[] = [];
    if (this.aggregator) {
      const baseTools = this.aggregator.getAllTools();
      result = baseTools.map(({ tool }) => ({
        type: 'function',
        function: tool
      }));
    }

    // include internal functions
    if (this.functions) {
      result = result.concat(Object.values(this.functions).map(({ name, parameters, description }) => ({
        type: 'function',
        function: { name, parameters, description }
      })));
    }

    return result;
  }

  // we can apply some logic here once we run the tool
  private async callTool(toolName: string, args: Object): Promise<any> {
    const isMCPTool = this.aggregator?.findTool(toolName);
    if (isMCPTool && this.aggregator) {
      return this.aggregator.executeTool(toolName, args);
    }

    if (this.functions?.[toolName]) {
      return this.functions[toolName].execute(args);
    }

    throw new Error(`Tool: ${toolName} not found`);
  }

  public async close() {
    if (this.aggregator) {
      await this.aggregator.close();
    }
  }
}