import { getSmmValue } from "@/libs/dynamic.config";
import "dotenv/config";
export type RedisConfigType = {
  REDIS_USERNAME: string;
  REDIS_PASS: string;
  REDIS_HOST: string;
  REDIS_PORT: string | number;
};

export const RedisConfig: RedisConfigType = {
  REDIS_USERNAME: await getSmmValue("/crsai/prod/redis_username") ?? "",
  REDIS_PASS: await getSmmValue("/crsai/prod/redis_password") ?? "",
  REDIS_HOST: await getSmmValue("/crsai/prod/redis_host") ?? "",
  REDIS_PORT: await getSmmValue("/crsai/prod/redis_port") ?? "",
};
