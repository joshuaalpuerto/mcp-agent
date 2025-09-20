import { AgentLifecycleEvent } from '../agent/events';

export type WorkflowLifecycleEvent = {
  action: AgentLifecycleEvent
  workflowName: string; // agent name (or 'orchestrator')
  timestamp: string; // event timestamp
}