import OpenAI from 'openai';
import { wrapOpenAI } from 'langsmith/wrappers';
import { getAIConfig, OPENAI_API_KEY, OPENAI_BASE_URL, LANGSMITH_TRACING } from '../config';

export function createChatClient(config: any): OpenAI {

  let openai = new OpenAI({
    baseURL: getAIConfig(OPENAI_BASE_URL),
    apiKey: getAIConfig(OPENAI_API_KEY),
    ...config
  });

  if (openai && getAIConfig(LANGSMITH_TRACING)) {
    console.log('DEBUGGING MODE: langsmith wrapper enabled');
    openai = wrapOpenAI(openai);
  }

  return openai;
}