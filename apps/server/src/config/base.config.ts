
import { getSmmValue } from "@repo/shared";
import "dotenv/config";


type BaseConfigType = {
  NODE_ENV: string;
  GROQ_API_KEY: string;
  DATABASE_URI: string;
  MCP_BASE_URL: string;
};

export const BaseConfig: BaseConfigType = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  GROQ_API_KEY: await getSmmValue("/crsai/prod/groq_api_key") ?? "",
  DATABASE_URI:  await getSmmValue("/crsai/prod/database_url") ?? "",
  MCP_BASE_URL: String(process.env.MCP_BASE_URL),
};
