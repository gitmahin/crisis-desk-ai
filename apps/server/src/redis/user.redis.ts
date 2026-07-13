import { redisClient } from "@/libs/redis";
import type { CreateUserPayloadType } from "@repo/zod";



class UserRedisService {
    async hashUserLoginInfo(key: string, payload: Partial<CreateUserPayloadType>) {
        const result = await redisClient.hSet(key, payload)
        await redisClient.expire(key, 6 * 60)
        return result
    }

    async getHashUserLoginInfo(key: string): Promise<unknown> {
        const [, result] = await redisClient.multi().expire(key, 6 * 60).hGetAll(key).exec()
        if (!result || !Object.keys(result).length) return null
        return result
    }
}

export const userRedisService = new UserRedisService()