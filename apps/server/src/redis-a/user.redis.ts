import { redisClient } from "@/libs/redis";
import type { CreateUserPayloadType } from "@repo/zod";

/**
 * Service for managing user session data in Redis.
 *
 * Uses Redis Hashes to store user profiles. Hashes are preferred over
 * standard strings for objects because they use less memory and allow
 * partial updates.
 */
class UserRedisService {
  /**
   * Persists user login information in a Redis Hash.
   *
   * @param key - The unique identifier for the user session (usually user ID).
   * @param payload - The partial user data to store.
   * @returns The number of fields added to the hash.
   */
  async hashUserLoginInfo(
    key: string,
    payload: Partial<CreateUserPayloadType>
  ) {
    const result = await redisClient.hSet(key, payload);
    await redisClient.expire(key, 6 * 60);
    return result;
  }

  /**
   * Retrieves user login information and performs a "sliding window" expiration.
   *
   * @param key - The unique identifier for the user session.
   * @returns The user object if found, otherwise null.
   */
  async getHashUserLoginInfo(key: string): Promise<unknown> {
    const [, result] = await redisClient
      .multi()
      .expire(key, 6 * 60)
      .hGetAll(key)
      .exec();
    if (!result || !Object.keys(result).length) return null;
    return result;
  }
}

export const userRedisService = new UserRedisService();
