import "dotenv/config";

type BaseConfigType = {
  PORT: number;
  HOST: string;
  DATABASE_URL: string;
  GROQ_API_KEY: string;
};

export const baseConfig: BaseConfigType = {
  PORT: Number(process.env.PORT)!,
  HOST: String(process.env.HOST)!,
  DATABASE_URL: String(process.env.DATABASE_URL)!,
  GROQ_API_KEY: String(process.env.GROQ_AI_API_KEY)!,
};
