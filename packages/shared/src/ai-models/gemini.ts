import { createGoogleGenerativeAI } from "@ai-sdk/google";

let _google: ReturnType<typeof createGoogleGenerativeAI> | null = null;

export const getGoogle = (apikey: string) => {
  if (!_google) {
    _google = createGoogleGenerativeAI({
      apiKey: apikey,
    });
  }
  return _google;
};
