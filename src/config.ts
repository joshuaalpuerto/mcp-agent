import dotenv from 'dotenv';

dotenv.config();

// config keys
export const LANGSMITH_DEBUG = 'LANGSMITH_DEBUG';
export const DEBUG_MODE = 'DEBUG_MODE';
export const OPENAI_API_KEY = 'OPENAI_API_KEY';
export const OPENAI_BASE_URL = 'OPENAI_BASE_URL';
export const OPENAI_MAX_TOKENS = 'OPENAI_MAX_TOKENS';
export const LANGSMITH_TRACING = 'LANGSMITH_TRACING';
export const LANGSMITH_ENDPOINT = 'LANGSMITH_ENDPOINT';
export const LANGSMITH_API_KEY = 'LANGSMITH_API_KEY';
export const LANGSMITH_PROJECT = 'LANGSMITH_PROJECT';

const allConfigFromEnv = () => {
  return {
    [OPENAI_API_KEY]: process.env[OPENAI_API_KEY] || undefined,
    [OPENAI_BASE_URL]: process.env[OPENAI_BASE_URL] || undefined,
    [OPENAI_MAX_TOKENS]: process.env[OPENAI_MAX_TOKENS] || undefined,
    [LANGSMITH_DEBUG]: process.env[LANGSMITH_DEBUG] || undefined,
    [DEBUG_MODE]: process.env[DEBUG_MODE] || undefined,
    [LANGSMITH_TRACING]: process.env[LANGSMITH_TRACING] || undefined,
    [LANGSMITH_ENDPOINT]: process.env[LANGSMITH_ENDPOINT] || undefined,
    [LANGSMITH_API_KEY]: process.env[LANGSMITH_API_KEY] || undefined,
    [LANGSMITH_PROJECT]: process.env[LANGSMITH_PROJECT] || undefined,
  };
};

let userConfig: ReturnType<typeof allConfigFromEnv> = {} as any;

export const getAIConfig = (
  configKey: keyof typeof userConfig,
): string | undefined => {
  if (typeof userConfig[configKey] !== 'undefined') {
    return userConfig[configKey];
  }
  return allConfigFromEnv()[configKey];
};
