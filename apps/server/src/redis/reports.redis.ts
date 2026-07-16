import { redisClient } from "@/libs/redis";

class ReportsRedis {

    static REPORT_ANALYTICS_KEY: string = "analytics:"
    static REPORT_ANALYTICS_EXPIRY: number = 30

    async cacheReportAnalytics(key: string, data: any) {
        // cache for 10s
        const analytics_report_key = ReportsRedis.REPORT_ANALYTICS_KEY + key
        const res_2 = await redisClient.set(analytics_report_key, JSON.stringify(data), { expiration: { type: "EX", value: ReportsRedis.REPORT_ANALYTICS_EXPIRY } })
        return Number(res_2)
    }

    async getCachedReportAnalytics(key: string): Promise<[unknown, string | null]> {

        // redis keys
        const analytics_report_key = ReportsRedis.REPORT_ANALYTICS_KEY + key
        const req_analytics_count_key = `req_analytics_count:${key}`

        // get values
        const [analytics_report, ttl, request_count] = await redisClient.multi().get(analytics_report_key).ttl(analytics_report_key).get(req_analytics_count_key).exec()

        // convert to number if not
        const request_count_num = Number(request_count)
        const ttl_num = Number(ttl)

        console.log(`ttl: ${ttl_num} | request count: ${request_count_num}`)

        // If report ttl is less or equal to required ttl
        // and request_count is less than 3 times
        // increment count
        // first  request_count_num = nothing and redisClient.incr do nothing
        // second request_count_num = 0 and incr to 1
        // third request_count_num = 1 and incr to 2
        // fourth block as 2<2 is false
        if (ttl_num <= ReportsRedis.REPORT_ANALYTICS_EXPIRY && request_count_num < 2) {
            await redisClient.incr(req_analytics_count_key)

            // One time apply
            if (!request_count_num) {
                await redisClient.expire(req_analytics_count_key, ttl_num)
            }
        }

        if (!analytics_report) {
            return [null, null]
        }

        // If analytics_report key expiry is less then or equal 10 sec and
        // request count is greater than 5 set analytics_report expiry key
        // to 5 mins.
        // first request_count_num = nothing
        // second request_count_num = 0
        // third request_count_num = 1
        // 1 >= 1 true so, increase expiry of analytics report cache to 5mins 
        if (ttl_num <= ReportsRedis.REPORT_ANALYTICS_EXPIRY && request_count_num >= 1) {
            await redisClient.expire(analytics_report_key, 5 * 60)
        }

        const message = ttl_num >= ReportsRedis.REPORT_ANALYTICS_EXPIRY ? `Request cached for ${ttl}s due to excessive repeated requests.` : `Normal: ${ttl} request count: ${request_count_num}`
        return [JSON.parse(analytics_report as unknown as string), message] // parse already stringified value

    }

}

export const reportsRedis = new ReportsRedis()