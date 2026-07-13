import "dotenv/config";

type BaseConfigType = {
  NODE_ENV: string;
  GROQ_API_KEY: string;
  DATABASE_URI: string;
};

export const BaseConfig: BaseConfigType = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  GROQ_API_KEY: String(process.env.GROQ_AI_API_KEY),
  DATABASE_URI: process.env.DATABASE_URL ?? "",
};
