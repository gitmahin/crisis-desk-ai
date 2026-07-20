import { getSmmValue } from "@repo/shared";
import "dotenv/config";

type BaseConfigType = {
  PORT: number;
  HOST: string;
  DATABASE_URL: string;
  MONGO_URI: string;
  GROQ_API_KEY: string;
  VOYAGE_API_KEY: string;
};

export const baseConfig: BaseConfigType = {
  PORT: Number(process.env.PORT!),
  HOST: String(process.env.HOST!),
  DATABASE_URL: await getSmmValue("/crsai/prod/database_url") ?? "",
  GROQ_API_KEY: await getSmmValue("/crsai/prod/groq_api_key") ?? "",
  VOYAGE_API_KEY: await getSmmValue("/crsai/prod/voyage_ai_api_key") ?? "",
  MONGO_URI: await getSmmValue("/crsai/prod/groq_mongo_url") ?? "",
};
