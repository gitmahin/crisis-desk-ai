import { redisClient } from "@/libs/redis";

class ReportsRedis {
    async cacheReportAnalytics(key: string, data: any) {
        const [, res_2] = await redisClient.multi().set(key, JSON.stringify(data)).expire(key, 30).exec()
        return Number(res_2) === 1
    }
    async getCachedReportAnalytics(key: string) {
        return await redisClient.get(key)
    }

}

export const reportsRedis = new ReportsRedis()