
export type SharedConfigType = {
     DATABASE_URL: string;
    GEMINI_API_KEY: string
    GROQ_AI_API_KEY: string
}

export const sharedConfig: SharedConfigType = {
    DATABASE_URL: String(process.env.DATABASE_URL)!,
    GEMINI_API_KEY: String(process.env.GOOGLE_GENERATIVE_AI_API_KEY)!,
    GROQ_AI_API_KEY: String(process.env.GROQ_AI_API_KEY)!,
}