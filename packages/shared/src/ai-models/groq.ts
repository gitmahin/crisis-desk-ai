import { createGroq, type GroqProvider } from "@ai-sdk/groq";

let _groq: GroqProvider | null = null;

export const getGroq = (apiKey?: string): GroqProvider => {
    if (!_groq) {
        _groq = createGroq({ apiKey });
    }
    return _groq;
};

export type { GroqProvider };