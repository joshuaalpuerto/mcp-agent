import fs from 'fs';
import { type CallToolResult } from '../../src/tools/types';

export const writeLocalSystem = {
  name: 'writeLocalSystem',
  description: 'Write a file to the local system',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to write',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file',
      },
    },
  },
  execute: async (args: any): Promise<CallToolResult> => {
    const { path, content } = args;
    fs.writeFileSync(path, content);
    return { content: [{ type: 'text', text: `File written successfully in ${path}` }] };
  }
}