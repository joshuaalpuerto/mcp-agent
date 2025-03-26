
export enum PlanStatus {
  InProgress = "In Progress",
  Complete = "Complete",
}

export type PlanTask = {
  description: string;
  agent: string;
}

export type PlanStep = {
  objective: string;
  tasks: PlanTask[];
}

export type Plan = {
  steps: PlanStep[];
}

export type TaskResult = {
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