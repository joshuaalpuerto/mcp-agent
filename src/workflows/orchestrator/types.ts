
export enum PlanStatus {
  InProgress = "In Progress",
  Complete = "Complete",
}

export interface PlanTask {
  description: string;
  agent: string;
}

export interface PlanStep {
  objective: string;
  tasks: PlanTask[];
}

export interface Plan {
  steps: PlanStep[];
}

export interface TaskResult {
  task: PlanTask;
  result: string;
}

export type PlanTaskResult = PlanTask & {
  result: string;
}

export type PlanStepResult = PlanStep & {
  tasks: PlanTaskResult[];
  result: string;
}

export type PlanResult = Plan & {
  steps: PlanStepResult[];
  objective: string;
  result: string;
  status: PlanStatus;
}