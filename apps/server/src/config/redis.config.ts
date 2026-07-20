import { getSmmValue } from "@repo/shared";

import type { RedisConfigType } from "@repo/types"

export const RedisConfig: RedisConfigType = {
  REDIS_USERNAME: await getSmmValue("/crsai/prod/redis_username") ?? "",
  REDIS_PASS: await getSmmValue("/crsai/prod/redis_password") ?? "",
  REDIS_HOST: await getSmmValue("/crsai/prod/redis_host") ?? "",
  REDIS_PORT: Number(await getSmmValue("/crsai/prod/redis_port")),
};
