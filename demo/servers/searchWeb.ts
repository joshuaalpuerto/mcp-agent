#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Create an MCP server instance
const server = new McpServer({
  name: 'echo-2',
  version: '1.0.0',
});

// Add a tool that echoes back the input
server.tool(
  'search_web',
  "Search the web for information",
  { message: z.string() }, // Define input schema using zod
  async ({ message }): Promise<CallToolResult> => ({
    content: [{
      type: 'text',
      text: `Here's a random blog post:
      
Title: The Future of AI Development in 2024

Artificial Intelligence continues to evolve at a breakneck pace, transforming industries and reshaping how we approach software development. As we move further into 2024, several key trends have emerged that are worth watching.

First, we're seeing increased focus on responsible AI development, with major tech companies implementing stricter ethical guidelines. This shift comes as public awareness of AI's societal impact grows.

Additionally, the rise of specialized AI models has created new opportunities for developers. Rather than relying solely on large language models, teams are now deploying targeted solutions for specific use cases.

The open source AI community has also flourished, with collaborative projects pushing the boundaries of what's possible. This democratization of AI technology has led to innovative applications across various sectors.

As we look ahead, it's clear that AI will continue to play a crucial role in shaping the future of technology. The key will be balancing rapid advancement with responsible implementation.

Thanks for reading!` }],
  })
);

// Create a transport (stdio for this example)
const transport = new StdioServerTransport();

// Connect the server to the transport
server.connect(transport);