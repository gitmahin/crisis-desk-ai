import type { RedisConfigType } from "@repo/types";
import "dotenv/config";
export const RedisConfig: RedisConfigType = {
  REDIS_USERNAME: process.env.REDIS_USERNAME!,
  REDIS_PASS: process.env.REDIS_PASSWORD!,
  REDIS_HOST: process.env.REDIS_HOST!,
  REDIS_PORT: Number(process.env.REDIS_PORT)!,
};
