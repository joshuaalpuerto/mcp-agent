
type StdioServerConfig = {
  name: string;
  type: 'stdio';
  command: string;
  args?: string[];
}

type SSEServerConfig = {
  name: string;
  type: 'sse';
  url: string | URL;
}

type StreamableHTTPConfig = {
  name: string;
  type: 'http';
  url: string | URL;
}

type WebSocketServerConfig = {
  name: string;
  type: 'ws';
  url: string | URL;
}

export type ServerConfig = StdioServerConfig | SSEServerConfig | WebSocketServerConfig | StreamableHTTPConfig