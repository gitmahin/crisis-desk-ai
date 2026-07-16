import { redisClient } from "@/lib/redis";

class ReportRedis {
    
 async cacheNReports(data: [string, string][], ttlSeconds = 300): Promise<unknown> {
    const multi = redisClient.multi();
    for (const [key, value] of data) {
      multi.set(key, value, { expiration: {type: "EX", value: ttlSeconds} });
    }
    return await multi.exec();
  }

    async getNReports(keys:any) {
       return  await redisClient.mGet(keys)
    }


}

export const reportRedis = new ReportRedis()