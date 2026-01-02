import OpenAI from 'openai';
import MCPServerAggregator from '../mcp/mcpServerAggregator';
import { SimpleMemory, Memory } from '../memory';
import { LLMConfig, LLMInterface } from '../llm/types';
import { FunctionToolInterface } from '../tools/types';
import { ServerConfig } from '../mcp/types';
import { Logger } from '../logger';
import { EventEmitter } from '../eventEmitter';
import { AGENT_EVENTS, AgentLifecycleEvent } from './events';

export interface AgentConfig {
  name: string;
  description: string;
  serverConfigs?: ServerConfig[];
  history?: Memory;
  functions?: FunctionToolInterface[];
  llm: LLMInterface;
  maxIterations?: number;
  logger?: Logger;
}


export class Agent {
  public name: string;
  public description: string;
  public serverConfigs?: ServerConfig[];
  public functions?: Record<string, FunctionToolInterface>;
  private history: Memory;
  private llm: LLMInterface | null;
  private aggregator?: MCPServerAggregator;
  private maxIterations: number;
  private systemPrompt: string;
  private logger: Logger;
  private eventEmitter = new EventEmitter<AgentLifecycleEvent>();

  constructor(config: AgentConfig & {
    // optional aggregator
    // this is used when agent is used in a workflow that doesn't need to access MCP
    aggregator?: MCPServerAggregator;
  }) {
    this.logger = config.logger || Logger.getInstance();
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

    this.history = config.history || new SimpleMemory();
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

    this.logger.info(`[Agent: ${this.name}] working on user task: ${prompt}`);

    this.history.append({
      role: 'user',
      content: prompt,
    });
    this.emitEvent({
      action: AGENT_EVENTS.AGENT_START_TASK,
      metadata: { task: prompt, },
    });

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
          this.logger.info(`[Agent: ${this.name}] executing tool: ${toolCall.function.name}`);
          this.emitEvent({
            action: AGENT_EVENTS.AGENT_TOOL_CALL,
            metadata: { toolName: toolCall.function.name, args: toolCall.function.arguments },
          });

          const toolResult = await this.callTool(toolCall.function.name, typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments || {});

          if (!toolResult.content.length) {
            this.emitEvent({
              action: AGENT_EVENTS.AGENT_ERROR,
              metadata: { error: new Error(`Tool: ${toolCall.function.name} call failed`), context: { toolName: toolCall.function.name } },
            });
            throw new Error(`Tool: ${toolCall.function.name} call failed`);
          }

          this.emitEvent({
            action: AGENT_EVENTS.AGENT_TOOL_RESULT,
            metadata: { toolName: toolCall.function.name, result: toolResult },
          });

          const toolResultContent = JSON.stringify(toolResult) as string
          this.logger.info(`[Agent: ${this.name}] tool: ${toolCall.function.name} call result: ${toolResultContent}`);
          messages.push({
            role: 'tool',
            content: toolResultContent,
            tool_call_id: toolCall.id,
          });
        }
      } else {
        this.logger.info(`[Agent: ${this.name}] final response: ${result.content}`);
        // We only care about the actual result from the task
        this.history.append({
          role: 'assistant',
          content: result.content,
        });
        this.emitEvent({
          action: AGENT_EVENTS.AGENT_END_TASK,
          metadata: { task: prompt, response: result.content },
        });
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
  protected async callTool(toolName: string, args: Object): Promise<any> {
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

  // update the logger instance if needed
  // used in workflows 
  public setLogger(logger: Logger) {
    this.logger = logger;
  }

  private emitEvent(event: Omit<AgentLifecycleEvent, 'agentName' | 'timestamp'>) {
    this.eventEmitter.emit(`agent:lifecycle`, {
      ...event,
      agentName: this.name,
      timestamp: Date.now()?.toString()
    } as AgentLifecycleEvent);
  }

  public onAgentEvent(listener: (event: AgentLifecycleEvent) => void) {
    this.eventEmitter.on(`agent:lifecycle`, listener);
  }
}