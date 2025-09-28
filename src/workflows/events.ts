import { PlanStep, PlanStepResult, PlanTask, PlanTaskResult, PlanResult } from './orchestrator/types';

export const WORKFLOW_EVENTS = {
  WORKFLOW_START: 'workflow:start',
  WORKFLOW_STEP_START: 'workflow:step:start',
  WORKFLOW_STEP_END: 'workflow:step:end',
  WORKFLOW_TASK_START: 'workflow:task:start',
  WORKFLOW_TASK_END: 'workflow:task:end',
  WORKFLOW_ERROR: 'workflow:error',
  WORKFLOW_END: 'workflow:end',
} as const;

export type WorkflowStartEvent = {
  type: typeof WORKFLOW_EVENTS.WORKFLOW_START;
  input?: any;

};

export type WorkflowStepStartEvent = {
  type: typeof WORKFLOW_EVENTS.WORKFLOW_STEP_START;
  step: PlanStep;

};

export type WorkflowStepEndEvent = {
  type: typeof WORKFLOW_EVENTS.WORKFLOW_STEP_END;
  step: PlanStepResult;

};

export type WorkflowTaskStartEvent = {
  type: typeof WORKFLOW_EVENTS.WORKFLOW_TASK_START;
  task: PlanTask;

};

export type WorkflowTaskEndEvent = {
  type: typeof WORKFLOW_EVENTS.WORKFLOW_TASK_END;
  task: PlanTaskResult;

};

export type WorkflowErrorEvent = {
  type: typeof WORKFLOW_EVENTS.WORKFLOW_ERROR;
  error: any;
  context?: any;
};

export type WorkflowEndEvent = {
  type: typeof WORKFLOW_EVENTS.WORKFLOW_END;
  result: PlanResult;
};

export type WorkflowLifecycleEvent =
  (WorkflowStartEvent
    | WorkflowStepStartEvent
    | WorkflowStepEndEvent
    | WorkflowTaskStartEvent
    | WorkflowTaskEndEvent
    | WorkflowErrorEvent
    | WorkflowEndEvent) & {
      workflowId: string; // workflow ID
      timestamp: string; // event timestamp
    };

