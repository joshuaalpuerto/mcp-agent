import OpenAI from 'openai';
import { Agent } from '../../agent';
import { LLMInterface } from '../../llm/types';
import { fullPlanSchemaReponseFormat, generateFullPlanPrompt, generatePlanObjectivePrompt, generateTaskPrompt } from './prompt';
import { PlanResult, PlanStepResult, PlanTaskResult, PlanStatus } from './types';
import { Logger, LogLevel } from '../../logger';

class Orchestrator {
  llm: LLMInterface;
  planner: Agent;
  synthesizer: Agent;
  agents: Record<string, Agent>;
  maxIterations: number;
  logger: Logger;

  constructor(config: {
    llm: LLMInterface,
    agents: Agent[],
    planner?: Agent,
    synthesizer?: Agent,
    maxIterations?: number,
    logger?: Logger,
  }) {
    this.llm = config.llm;
    this.maxIterations = config.maxIterations || 2;
    this.logger = config.logger || Logger.getInstance();

    // load agent as it is as we don't need mcp here.
    this.planner = config.planner || new Agent({
      name: "LLM Orchestration Planner",
      description: `
                You are an expert planner. Given an objective task and a list of Agents (which are collections of servers), your job is to break down the objective into a series of steps,
                which can be performed by LLMs with access to the servers or agents.
                `,
      llm: config.llm,
    });

    this.synthesizer = config.synthesizer || new Agent({
      name: "LLM Orchestration Synthesizer",
      description: `
                You are an expert synthesizer. Given a list of steps and their results, your job is to synthesize the results into a cohesive result.
                `,
      llm: config.llm,
    });

    this.agents = {};
    for (const agent of config.agents) {
      this.agents[agent.name] = agent;
    }
  }

  async generate(
    message: string,
  ): Promise<string> {
    const objective = String(message);
    const planResult: PlanResult = {
      steps: [],
      objective: objective,
      result: '',
      status: PlanStatus.InProgress,
    };

    this.logger.log(LogLevel.INFO, `Generating full plan for objective: ${objective}`);
    const prompt = await this.prepareFullPlanPrompt(objective);
    const plan: PlanResult = await this.planner.generateStructuredResult(prompt, {
      responseFormat: fullPlanSchemaReponseFormat as OpenAI.ResponseFormatJSONSchema
    });

    for (const step of plan.steps) {
      const stepResult = await this.executeStep(step, planResult);
      planResult.steps.push(stepResult);
    }

    const planResultInfo = await this._formatPlanResultInfo(planResult);
    return this.synthesizer.generateStr(planResultInfo);
  }

  async executeStep(
    step: PlanStepResult,
    previousResult: PlanResult
  ): Promise<PlanStepResult> {

    const previousResultInfo = await this._formatPlanResultInfo(previousResult);
    const stepResult: PlanStepResult = {
      objective: step.objective,
      tasks: [],
      result: '',
    };

    for (const task of step.tasks) {
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

      const result = await agent.generateStr(context);
      this.logger.log(LogLevel.INFO, `[Agent: ${task.agent}]\nTask: ${task.description}\nResult: ${result}`);
      stepResult.tasks.push({
        ...task,
        result: result,
      });
    }

    return stepResult;
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