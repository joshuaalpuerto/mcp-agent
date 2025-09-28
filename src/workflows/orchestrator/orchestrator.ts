import OpenAI from 'openai';
import { Agent } from '../../agent';
import { LLMInterface } from '../../llm/types';
import { Logger } from '../../logger';
import { SimpleMemory, Memory } from '../../memory';
import { fullPlanSchemaResponseFormat, generateFullPlanPrompt, generatePlanObjectivePrompt, generateTaskPrompt } from './prompt';
import { PlanResult, PlanStepResult, PlanTaskResult, PlanStatus } from './types';
import { EventEmitter } from '../../eventEmitter';
import { WORKFLOW_EVENTS, WorkflowLifecycleEvent } from '../events';

class Orchestrator {
  private llm: LLMInterface;
  private planner: Agent;
  private synthesizer: Agent;
  private agents: Record<string, Agent>;
  private logger: Logger;
  private eventEmitter = new EventEmitter<WorkflowLifecycleEvent>();
  private workflowId: string | undefined;

  constructor(config: {
    llm: LLMInterface,
    agents: Agent[],
    planner?: Agent,
    synthesizer?: Agent,
    maxIterations?: number,
    logger?: Logger,
    history?: Memory;
  }) {
    this.llm = config.llm;
    this.logger = config.logger || Logger.getInstance();

    // load agent as it is as we don't need mcp here.
    this.planner = config.planner || new Agent({
      name: "LLM Orchestration Planner",
      description: `
                You are an expert planner. Given an objective task and a list of Agents (which are collections of servers), your job is to break down the objective into a series of steps,
                which can be performed by LLMs with access to the servers or agents.
                `,
      llm: this.llm,
      history: config.history || new SimpleMemory()
    });

    this.synthesizer = config.synthesizer || new Agent({
      name: "LLM Orchestration Synthesizer",
      description: `
                You are an expert synthesizer. Given a list of steps and their results, your job is to synthesize the results into a cohesive result.
                `,
      llm: this.llm,
    });

    this.agents = {};
    for (const agent of config.agents) {
      agent.setLogger(this.logger)
      this.agents[agent.name] = agent;
    }
  }

  private emitEvent(event: Partial<WorkflowLifecycleEvent>) {
    if (!this.workflowId) return;
    this.eventEmitter.emit(
      'workflow:lifecycle',
      {
        ...event,
        workflowId: this.workflowId,
        timestamp: new Date().toISOString(),
      } as WorkflowLifecycleEvent
    );
  }

  public onWorkflowEvent(listener: (event: WorkflowLifecycleEvent) => void) {
    this.eventEmitter.on('workflow:lifecycle', listener);
  }

  async generate(
    message: string,
  ): Promise<PlanResult> {

    this.workflowId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const objective = String(message);
    const planResult: PlanResult = {
      steps: [],
      objective: objective,
      result: '',
      status: PlanStatus.InProgress,
    };

    // Emit workflow start event
    this.emitEvent({
      type: WORKFLOW_EVENTS.WORKFLOW_START,
      input: objective
    });

    this.logger.info(`Generating full plan for objective: ${objective}`);
    const prompt = await this.prepareFullPlanPrompt(objective);
    const plan: PlanResult = await this.planner.generateStructuredResult(prompt, {
      responseFormat: fullPlanSchemaResponseFormat as OpenAI.ResponseFormatJSONSchema
    });

    for (let stepIndex = 0; stepIndex < plan.steps.length; stepIndex++) {
      const step = plan.steps[stepIndex];

      // Emit step start event
      this.emitEvent({
        type: WORKFLOW_EVENTS.WORKFLOW_STEP_START,
        step: step
      });

      try {
        const stepResult = await this.executeStep(step, planResult);
        planResult.steps.push(stepResult);

        // Emit step end event
        this.emitEvent({
          type: WORKFLOW_EVENTS.WORKFLOW_STEP_END,
          step: stepResult,
        });
      } catch (error) {
        // Emit error event
        this.emitEvent({
          type: WORKFLOW_EVENTS.WORKFLOW_ERROR,
          error,
          context: { step, stepIndex },
        });
        throw error;
      }
    }

    const planResultInfo = await this._formatPlanResultInfo(planResult);
    const finalResult = await this.synthesizer.generateStr(planResultInfo);
    planResult.result = finalResult;
    planResult.status = PlanStatus.Complete;

    // Emit workflow end event
    this.emitEvent({
      type: WORKFLOW_EVENTS.WORKFLOW_END,
      result: planResult,
    });

    return planResult;
  }

  async generateStr(message: string): Promise<string> {
    const result = await this.generate(message);
    return result.result;
  }

  async executeStep(
    step: PlanStepResult,
    previousResult: PlanResult,
  ): Promise<PlanStepResult> {
    const previousResultInfo = await this._formatPlanResultInfo(previousResult);

    for (let taskIndex = 0; taskIndex < step.tasks.length; taskIndex++) {
      const task = step.tasks[taskIndex];

      // Emit task start event
      this.emitEvent({
        type: WORKFLOW_EVENTS.WORKFLOW_TASK_START,
        task,
      });

      const agent = this.agents[task.agent]
      if (!agent) {
        throw new Error(`No agent found matching ${task.agent}`);
      }

      const context = generateTaskPrompt({
        // overall objective
        objective: previousResult.objective,
        task: task.description,
        previousResultInfo: previousResultInfo,
      });

      task.result = await agent.generateStr(context);
      this.logger.info(`[Agent: ${task.agent}]\nTask: ${task.description}\nResult: ${task.result}`);


      this.emitEvent({
        type: WORKFLOW_EVENTS.WORKFLOW_TASK_END,
        task,
      });
    }

    return step;
  }

  async prepareFullPlanPrompt(
    objective: string,
  ): Promise<string> {
    const agentsInfo = await this._formatAgentsInfo();

    return generateFullPlanPrompt({
      objective: objective,
      agents: agentsInfo,
    });
  }

  async _formatAgentsInfo(): Promise<string> {
    const agentsInfo = await Promise.all(Object.values(this.agents).map(async (agent, idx) => {
      const agentInfo = await this._formatAgentInfo(agent.name);
      return `${idx + 1}. ${agentInfo}`
    }))
    return agentsInfo.join('\n');
  }

  async _formatAgentInfo(agentName: string): Promise<string> {
    const agent = this.agents[agentName];
    if (!agent) {
      return "";
    }

    const tools = await agent.listTools()

    const servers = tools.map(tool =>
      `- ${tool.function.name} - ${tool.function.description}`
    ).join('\n');

    return `Agent Name: ${agent.name}
    Description: ${agent.description}
    Capabilities:
    ${servers}`;
  }

  async _formatPlanResultInfo(planResult: PlanResult): Promise<string> {
    const formatStepResult = (step: PlanStepResult): string => {
      const tasksStr = step.tasks
        .map((task: PlanTaskResult) => `- Task: ${task.description}\nResult: ${task.result || ''}`)
        .join("\n");

      return `Step: ${step.objective}\nStep Subtasks:\n${tasksStr}`;
    }

    const stepsStr = planResult?.steps
      ?.map((step: PlanStepResult, i) => `${i + 1}. ${formatStepResult(step)}`)
      ?.join("\n\n") ?? "No steps executed yet";

    return generatePlanObjectivePrompt({
      planResultString: stepsStr,
    })
  }
}



export { Orchestrator };