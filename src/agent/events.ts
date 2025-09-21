export const AGENT_EVENTS = {
  AGENT_START_TASK: 'agent:start:task',
  AGENT_TOOL_CALL: 'agent:tool:call',
  AGENT_TOOL_RESULT: 'agent:tool:result',
  AGENT_END_TASK: 'agent:end:task',
  AGENT_ERROR: 'agent:error',
} as const;

type AgentStartTaskData = {
  action: typeof AGENT_EVENTS.AGENT_START_TASK,
  metadata: {
    task: string;
  }
};

type AgentToolCallData = {
  action: typeof AGENT_EVENTS.AGENT_TOOL_CALL,
  metadata: {
    toolName: string;
    args: any;
  }
};

type AgentToolResultData = {
  action: typeof AGENT_EVENTS.AGENT_TOOL_RESULT,
  metadata: {
    toolName: string;
    result: any;
  }
};

type AgentEndTaskData = {
  action: typeof AGENT_EVENTS.AGENT_END_TASK,
  metadata: {
    task: string;
    response: any;
  }
};

type AgentErrorData = {
  action: typeof AGENT_EVENTS.AGENT_ERROR,
  metadata: {
    error: Error;
    context?: any;
  }
};

// descriminated union type for agent lifecycle events
export type AgentLifecycleEvent =
  (AgentStartTaskData
    | AgentToolCallData
    | AgentToolResultData
    | AgentEndTaskData
    | AgentErrorData) & {
      agentName: string; // agent name
      timestamp: string; // event timestamp
    }

