import { RedisConfig } from "@/config";

import { createClient } from "redis";

export const redisClient = createClient({
  username: `${RedisConfig.REDIS_USERNAME}`,
  password: `${RedisConfig.REDIS_PASS}`,
  disableOfflineQueue: true, // disable queuing data when connection is down.
  socket: {
    host: `${RedisConfig.REDIS_HOST}`,
    port: Number(RedisConfig.REDIS_PORT),
    reconnectStrategy: (retries) => {
      // Generate a random jitter between 0 – 100 ms:
      const jitter = Math.floor(Math.random() * 100);

      // Delay is an exponential backoff, (2^retries) * 50 ms, with a
      // maximum value of 3000 ms:
      const delay = Math.min(Math.pow(2, retries) * 50, 3000);

      return delay + jitter;
    },
    connectTimeout: 10000, // in milliseconds

    // tls: true,
    // key: fs.readFileSync('./redis_user_private.key'),
    // cert: fs.readFileSync('./redis_user.crt'),
    // ca: [fs.readFileSync('./redis_ca.pem')]
  },
});

redisClient.on("error", (err: unknown) =>
  console.log("Redis Client Error", err)
);

redisClient.on("reconnecting", () =>
  console.log(
    "The client is about to try reconnecting after the connection was lost due to an error."
  )
);

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}
