
type StdioServerConfig = {
  name: string;
  type: 'stdio';
  command: string;
  args: string[];
}

type SSEServerConfig = {
  name: string;
  type: 'sse';
  url: string;
}

type SmitheryServerConfig = {
  name: string;
  type: 'smithery';
  deploymentUrl: string;
  configSchema: any;
}

export type ServerConfig = StdioServerConfig | SmitheryServerConfig | SSEServerConfig