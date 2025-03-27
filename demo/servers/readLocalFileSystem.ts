#!/usr/bin/env node
import fs from 'fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Create an MCP server instance
const server = new McpServer({
  name: 'read-local-file-system',
  version: '1.0.0',
});

// Add a tool that echoes back the input
server.tool(
  'read_file_from_local_file_system',
  "Read a file from the local file system",
  { file_path: z.string() }, // Define input schema using zod
  async ({ file_path }): Promise<CallToolResult> => {
    const content = fs.readFileSync(file_path, 'utf8');
    return {
      content: [{
        type: 'text', text:
          `file read from ${file_path}: ${content}`
      }],
    }
  }
);

// Create a transport (stdio for this example)
const transport = new StdioServerTransport();

// Connect the server to the transport
server.connect(transport);