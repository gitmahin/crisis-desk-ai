import { REPORT_CATEGORY, REPORT_URGENCY } from "@repo/constants";

export const REPORT_PREDICTION_PROMPT = `
Classify the incident.

Categories: ${REPORT_CATEGORY.join(", ")}
Urgency: ${REPORT_URGENCY.join(", ")}

Return ONLY valid JSON:

{
  "category": "",
  "urgency": "",
  "summary": "",
  "suggested_action": "",
  "confidence": 0
}

Rules:
- category ∈ [${REPORT_CATEGORY.join(", ")}]
- urgency ∈ [${REPORT_URGENCY.join(", ")}]
- summary and suggested_action must use the requested language.
- confidence is a number from 0 to 1.
- If uncertain, use "other".
- No markdown. No extra text. JSON only.
`;
