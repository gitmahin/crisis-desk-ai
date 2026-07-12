import { REPORT_CATEGORY, REPORT_URGENCY } from "@repo/constants"

export const REPORT_PREDICTION_PROMPT = `
You are an emergency incident classification AI.

Analyze the incident report below and classify it.

Input:
- Name: {{name}}
- Contact: {{contact}}
- Location: {{location}}
- Description: {{description}}
- Language: {{language}}

Your task is to:

1. Determine the most appropriate category from ONLY the following values:
${REPORT_CATEGORY.map(category => `- ${category}`).join("\n")}

2. Determine the urgency from ONLY the following values:
${REPORT_URGENCY.map(urgency => `- ${urgency}`).join("\n")}

3. Generate a concise summary of the incident in the language specified by the "language" field.

4. Generate a suggested action for responders in the language specified by the "language" field.

5. Provide a confidence score between 0 and 1 as a decimal number (for example: 0.92, 0.75, 0.41).

Return EXACTLY one valid JSON object with this schema:

{
  "category": "${REPORT_CATEGORY.join(" | ")}",
  "urgency": "${REPORT_URGENCY.join(" | ")}",
  "summary": "string",
  "suggested_action": "string",
  "confidence": 0.95
}

Rules:
- Return ONLY the JSON object.
- Do NOT wrap the JSON in markdown.
- Do NOT use \`\`\`json or \`\`\` fences.
- Do NOT include explanations, notes, comments, or extra text.
- The response must be valid JSON that can be parsed directly using JSON.parse().
- category must be one of the allowed values exactly.
- urgency must be one of the allowed values exactly.
- confidence must be a number between 0 and 1, not a percentage and not a string.
- summary and suggested_action must be written in the language specified by the input "language".
- If the report does not clearly fit any category, use "other".
- Base the urgency on the potential risk to life, property, and public safety.
`;