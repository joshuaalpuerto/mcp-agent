import OpenAI from 'openai';
import { getAIConfig, OPENAI_API_KEY, OPENAI_BASE_URL } from '../config';
import { AIResponseFormat, LLMInterface, LLMConfig, LLMResult } from './types';
import { createChatClient } from './serviceCaller';

type FireworksResponseFormat = {
  type: AIResponseFormat.JSON;
  schema: Record<string, any>
}

export class LLMFireworks implements LLMInterface {
  private client: OpenAI;
  private model: string;
  private config: LLMConfig;

  constructor(model: string, config: LLMConfig) {
    this.client = createChatClient({
      baseURL: getAIConfig(OPENAI_BASE_URL),
      apiKey: getAIConfig(OPENAI_API_KEY),
      ...config,

    });
    this.model = model;
    this.config = config;
  }

  async generate(params: {
    messages: OpenAI.ChatCompletionMessageParam[];
    config: LLMConfig;
  }): Promise<LLMResult> {
    const { messages, config } = params;
    const configToUse = { ...this.config, ...config };
    const commonConfig: OpenAI.ChatCompletionCreateParams = {
      model: this.model,
      messages,
      tools: configToUse?.tools,
      max_tokens: configToUse?.maxTokens ?? 2048,
      temperature: configToUse?.temperature ?? 0.1,
    }

    // if response format is available lets format it a bit as fireworks expect a bit different format
    if (configToUse?.responseFormat?.json_schema) {
      const responseFormat: OpenAI.ChatCompletionCreateParams['response_format']
        | OpenAI.ResponseFormatJSONSchema
        | FireworksResponseFormat = {
        type: AIResponseFormat.JSON,
        schema: configToUse?.responseFormat?.json_schema?.schema,
      };
      commonConfig.response_format = responseFormat;
    }

    try {
      if (configToUse?.stream) {
        const completion = await this.client.chat.completions.create({
          ...commonConfig,
          stream: true,
        } as OpenAI.ChatCompletionCreateParamsStreaming);

        const result = await this.handleStreamResponse(completion);

        return {
          content: result.content,
          usage: result.usage,
          toolCalls: result.toolCalls,
          finishReason: result.finishReason,
        }
      } else {
        const completion: OpenAI.ChatCompletion = await this.client.chat.completions.create({
          ...commonConfig,
          stream: false,
        } as OpenAI.ChatCompletionCreateParamsNonStreaming);

        return {
          content: completion.choices[0].message.content || '',
          usage: completion.usage,
          toolCalls: completion.choices[0].message.tool_calls,
          finishReason: completion.choices[0].finish_reason,
        };
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private async handleStreamResponse(stream: AsyncIterable<OpenAI.ChatCompletionChunk>): Promise<LLMResult> {
    let contentChunk = '';
    let toolCall: Record<number, OpenAI.ChatCompletionMessageToolCall> | undefined = {};
    let usage: OpenAI.CompletionUsage | undefined;
    let finishReason: string | undefined;

    return new Promise(async (resolve) => {
      for await (const chunk of stream) {
        contentChunk += (chunk.choices[0]?.delta?.content || '');
        if (chunk.choices[0]?.delta?.tool_calls?.length) {
          // LLM could return multiple tool_calls so we need to register them in their index.
          const chunkToolCall = chunk.choices[0].delta.tool_calls[0] as OpenAI.ChatCompletionMessageToolCall & { index: number };
          if (!toolCall?.[chunkToolCall.index]) {
            // When the first tool call is received, we need to initialize the tool call object which have initial id, type and function.name
            toolCall[chunkToolCall.index] = chunk.choices[0].delta.tool_calls[0] as OpenAI.ChatCompletionMessageToolCall;
          }
          // function argumetn might come in multiple chunks, so we need to concatenate them
          toolCall[chunkToolCall.index].function.arguments += chunk.choices[0].delta.tool_calls[0].function?.arguments || ''
        }
        usage = chunk.usage || undefined
        finishReason = chunk.choices[0]?.finish_reason || undefined
      }

      resolve({ content: contentChunk, toolCalls: toolCall ? Object.values(toolCall) : [], usage, finishReason })
    })
  }

  private handleError(error: any): Error {
    if (error instanceof OpenAI.APIError) {
      return new Error(`LLM API error (${error.status}): ${error.message}`);
    }
    return new Error(`Request failed: ${error.message}`);
  }
}
