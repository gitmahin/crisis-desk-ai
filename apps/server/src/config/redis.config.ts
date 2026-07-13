import "dotenv/config"
export type RedisConfigType = {
  REDIS_USERNAME: string;
  REDIS_PASS: string;
  REDIS_HOST: string;
  REDIS_PORT: string | number;
};

export const RedisConfig: RedisConfigType = {
  REDIS_USERNAME: process.env.REDIS_USERNAME!,
  REDIS_PASS: process.env.REDIS_PASSWORD!,
  REDIS_HOST: process.env.REDIS_HOST!,
  REDIS_PORT: process.env.REDIS_PORT!,
};