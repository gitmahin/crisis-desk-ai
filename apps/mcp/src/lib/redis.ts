import { RedisConfig } from "@/config";
import type { RedisClientType } from "redis";
import { createRedisClient, ReportsRedis } from "@repo/shared";

/**
 * The primary Redis client instance for the application.
 * 
 * Initialized using credentials provided by {@link RedisConfig}. This client 
 * acts as the low-level transport for all Redis-based operations.
 */
export const redisClient: RedisClientType = createRedisClient(
  RedisConfig.REDIS_USERNAME,
  RedisConfig.REDIS_PASS,
  RedisConfig.REDIS_HOST,
  RedisConfig.REDIS_PORT
);

redisClient.on("error", (err: unknown) =>
  console.error("Redis Client Error", err)
);

/**
 * Reconnection event listener.
 * 
 * Triggered when the client loses its connection to the Redis server 
 * and attempts to re-establish the link.
 */
redisClient.on("reconnecting", () =>
  console.error(
    "The client is about to try reconnecting after the connection was lost due to an error."
  )
);

/**
 * Establishes a connection to the Redis server.
 * 
 * This function is idempotent: it checks the current connection state 
 * using `.isOpen` before attempting a new connection.
 * 
 * @returns {Promise<void>} Resolves when the connection is successfully opened.
 * 
 * @remarks
 * This should be called during the application's bootstrap phase, 
 * typically alongside other database initialization routines.
 */
export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

// Redis instances
export const reportRedis = new ReportsRedis(redisClient);
