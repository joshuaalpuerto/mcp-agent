import { OpenAI } from 'openai';
import { type CallToolResult as CallToolResultType, type CompatibilityCallToolResult as CompatibilityCallToolResultType } from '@modelcontextprotocol/sdk/types';

export type Tool = OpenAI.ChatCompletionTool['function'];

export type FunctionToolInterface = OpenAI.ChatCompletionTool['function'] & {
  execute: (args: any) => Promise<any> | any;
}

export type CallToolResult = CallToolResultType | CompatibilityCallToolResultType
