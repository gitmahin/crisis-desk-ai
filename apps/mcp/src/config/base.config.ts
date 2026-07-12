import "dotenv/config"

type BaseConfigType = {
    PORT: number
    HOST: string
    GEMINI_API_KEY: string
}

export const baseConfig: BaseConfigType = {
    PORT: Number(process.env.PORT) || 5001,
    HOST: String(process.env.HOST) || '127.0.0.1',
    GEMINI_API_KEY: String(process.env.GEMINI_API_KEY)!
}