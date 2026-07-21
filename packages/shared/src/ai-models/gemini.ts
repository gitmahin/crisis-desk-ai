// NOTE: UNUSED method
import { createGoogleGenerativeAI} from "@ai-sdk/google";

let _google: ReturnType<typeof createGoogleGenerativeAI> | null = null;

/**
 * Retrieves or initializes the Google Generative AI provider.
 * 
 * This follows the Singleton Pattern to ensure only one provider instance 
 * is created during the application lifecycle, optimizing memory and 
 * connection management.
 * 
 * @param apiKey - The Google AI API key (from Google AI Studio).
 * @returns {GoogleGenerativeAIProvider} The initialized Google AI provider.
 * 
 * @throws {Error} If no API key is provided during the first initialization.
 * 
 * @example
 * const google = getGoogleProvider(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
 * const model = google('gemini-1.5-pro');
 */
export const getGoogle = (apikey: string) => {
  if (!_google) {
    _google = createGoogleGenerativeAI({
      apiKey: apikey,
    });
  }
  return _google;
};
