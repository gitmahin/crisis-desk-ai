import { createGroq, type GroqProvider } from "@ai-sdk/groq";

let _groq: GroqProvider | null = null;

/**
 * Retrieves or initializes the Groq AI provider.
 *
 * Groq is used in this architecture for ultra-low latency text generation
 * and classification, essential for real-time incident analysis.
 *
 * @param apiKey - The Groq API key. If omitted, the SDK will attempt to
 *                 use the `GROQ_API_KEY` environment variable.
 * @returns {GroqProvider} The initialized Groq provider instance.
 *
 * @throws {Error} If no API key is provided and no environment variable is set
 *                 during the initial call.
 */
export const getGroq = (apiKey?: string): GroqProvider => {
  if (!_groq) {
    _groq = createGroq({ apiKey });
  }
  return _groq;
};

export type { GroqProvider };
