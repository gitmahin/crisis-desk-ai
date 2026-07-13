import "dotenv/config";

type BaseConfigType = {
  NODE_ENV: string;
  GROQ_API_KEY: string;
  DATABASE_URI: string;
  MCP_BASE_URL: string
};

export const BaseConfig: BaseConfigType = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  GROQ_API_KEY: String(process.env.GROQ_AI_API_KEY),
  DATABASE_URI: process.env.DATABASE_URL ?? "",
  MCP_BASE_URL: process.env.MCP_BASE_URL ?? "http://localhost:5001"
};
