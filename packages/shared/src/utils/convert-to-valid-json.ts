/**
 * Sanitizes and parses JSON strings, specifically handling LLM markdown wrappers.
 *
 * LLMs often wrap JSON outputs in markdown code blocks. This function extracts
 * the raw JSON content and attempts to transform it into a JavaScript object.
 *
 * @param data - The raw string output from an LLM or external source.
 * @returns The parsed JSON object if successful; otherwise, the original cleaned string.
 *
 * @example
 * const raw = "```json\n{\"id\": 1}\n```";
 * const obj = convertToValidJson(raw); // returns { id: 1 }
 */
export const convertToValidJson = (data: string) => {
  const cleaned = data
    .trim()
    .replace(/^```json/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return data;
  }
};
