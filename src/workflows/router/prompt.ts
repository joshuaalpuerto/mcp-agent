export const generateRoutingPrompt = (variables: { context: string, top_k: number, request: string }) => `
You are a highly accurate request router that directs incoming requests to the most appropriate category.
A category is a specialized tool with a specific set of capabilities and purpose.
Below are the available routing categories, each with their capabilities and descriptions:

${variables.context}

Your task is to analyze the following request and determine the most appropriate categories from the options above. Consider:
- The specific capabilities and tools each destination offers
- How well the request matches the category's description
- Whether the request might benefit from multiple categories (up to ${variables.top_k})

Request: ${variables.request}

Respond in JSON format:
{{
    "categories": [
        {{
            "category": <category name>,
            "confidence": <high, medium or low>,
            "reasoning": <brief explanation>
        }}
    ]
}}

Only include categories that are truly relevant. You may return fewer than ${variables.top_k} if appropriate.
If none of the categories are relevant, return an empty list.
`
