export const generateTaskPrompt = (variables: { objective: string, task: string, previousResultInfo: string }) => `You are part of a larger workflow to achieve the objective: ${variables.objective}.
Your job is to accomplish only the following task: ${variables.task}.

Results so far that may provide helpful context:
${variables.previousResultInfo}`

export const generatePlanObjectivePrompt = (variables: { planResultString?: string }) => `Progress So Far (steps completed):
${variables.planResultString || ''}`

export const generateFullPlanPrompt = (variables: { objective: string, agents: string }) => `You are tasked with orchestrating a plan to complete an objective.
You can analyze results from the previous steps already executed to decide if the objective is complete.
Your plan must be structured in sequential steps, with each step containing independent parallel subtasks.

Objective: ${variables.objective}

You have access to the following Agents with their tools:

Agents:
${variables.agents}

Generate a plan with all remaining steps needed.
Steps are sequential, but each Step can have parallel subtasks.
For each Step, specify an objective of the step and independent subtasks that can run in parallel.
For each subtask specify:
    1. Clear description of the task that an LLM can execute  
    2. Name of 1 Agent OR List of MCP server names to use for the task
    
Return your response in the following JSON structure:
    {{
        "steps": [
            {{
                "objective": "Objective for this step 1",
                "tasks": [
                    {{
                        "description": "Description of task 1",
                        "agent": "agent_name"  # For AgentTask
                    }},
                    {{
                        "description": "Description of task 2", 
                        "agent": "agent_name2"
                    }}
                ]
            }}
        ],
        "isComplete": false
    }}

You must respond with valid JSON only, with no triple backticks. No markdown formatting.
No extra text. Do not wrap in \`\`\`json code fences.`;

export const fullPlanSchemaResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'plan',
    strict: true,
    description: "A structured plan containing sequential steps with parallel subtasks",
    schema: {
      type: "object",
      strict: true,
      properties: {
        steps: {
          type: "array",
          description: "An ordered list of steps to be executed sequentially",
          items: {
            type: "object",
            description: "A single step containing a high-level description and parallel subtasks",
            properties: {
              objective: {
                type: "string",
                description: "A clear objective of what this step aims to achieve in the overall plan"
              },
              tasks: {
                type: "array",
                description: "List of independent tasks that can be executed in parallel within this step",
                items: {
                  type: "object",
                  description: "A specific task to be executed by an agent",
                  properties: {
                    description: {
                      type: "string",
                      description: "Detailed description of what the LLM/agent needs to do, should be clear and actionable"
                    },
                    agent: {
                      type: "string",
                      description: "Name of the agent that will execute this task. Must match one of the available agent names provided"
                    }
                  },
                  required: ["description", "agent"]
                }
              }
            },
            required: ["objective", "tasks"]
          }
        },
        isComplete: {
          type: "boolean",
          description: "Indicates whether the objective has been fully achieved (true) or if more steps are needed (false)"
        }
      },
      required: ["steps", "isComplete"]
    }
  }
};

