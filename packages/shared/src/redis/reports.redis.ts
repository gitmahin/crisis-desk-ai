import type { RedisClientType } from "redis";

export interface IReportsRedis {
  cacheNReports(
    data: any[],
    page: number,
    ttlSeconds?: number
  ): Promise<unknown>;

  getNReports(page: number): Promise<(string | null)[]>;

  // pass user ip as key
  cacheReportAnalytics(key: string, data: any): Promise<number>;

  // pass user ip as key
  getCachedReportAnalytics(key: string): Promise<[unknown, string | null]>;

  // pass report id as key
  cacheSingleReportById(key: string, data: unknown): Promise<unknown>;
  // pass report id as key
  deleteSingleReportCache(key: string): Promise<unknown>;

  clearReportsAllCache(): Promise<unknown>;
}

/**
 * Redis Service implementation for Report Caching and Analytics Protection.
 * 
 * Implements an "Anti-Stampede" and "Adaptive TTL" strategy to ensure high 
 * availability during crisis events.
 */
export class ReportsRedis implements IReportsRedis {
  // Cache Key Prefixes
  static REPORT_ANALYTICS_KEY: string = "analytics:";
  static REPORTS_COUNT_CACHE_KEY = "reports_count";
  static REPORTS_CACHE_KEY = "reports:";
  static SINGLE_REPORTS_CACHE_KEY = "reports:id:";

  // Expiration Constants (Seconds)
  static REPORT_ANALYTICS_EXPIRY: number = 30;
  static REPORT_INVALID_BULK_REQUEST_EXPIRY: number = 5 * 60;
  static SINGLE_REPORT_EXPIRY = 30;

  private redisClient: RedisClientType;
  constructor(client: RedisClientType) {
    this.redisClient = client;
  }

  /**
   * Caches multiple reports using an atomic multi-set operation.
   * Each report is stored in a granular key to allow for future specific invalidation.
   */
  async cacheNReports(
    data: any[],
    page: number,
    ttlSeconds = 300
  ): Promise<unknown> {
    const cache_data: [string, string][] = data.map((item, i) => [
      ReportsRedis.REPORTS_CACHE_KEY + page + ":" + i,
      JSON.stringify(item),
    ]);
    const multi = this.redisClient.multi();
    for (const [key, value] of cache_data) {
      multi.set(key, value, { expiration: { type: "EX", value: ttlSeconds } });
    }
    multi.set(ReportsRedis.REPORTS_COUNT_CACHE_KEY, data.length);
    return await multi.exec();
  }

  /**
 * Retrieves paginated reports using MGET (Multiple Get).
 * 
 * @remarks
 * This is a high-performance operation as it fetches all items 
 * in a single network round-trip.
 */
  async getNReports(page: number) {
    const reports_count = await this.redisClient.get(
      ReportsRedis.REPORTS_COUNT_CACHE_KEY
    );
    const count = Number(reports_count) || 0;
    if (count === 0) return [];
    const cache_keys = Array.from({ length: count }).map(
      (item, i) => ReportsRedis.REPORTS_CACHE_KEY + page + ":" + i
    );
    return await this.redisClient.mGet(cache_keys);
  }

  /**
 * Retrieves cached analytics with Adaptive Throttling logic.
 * 
 * @logic
 * If a user requests analytics more than three time within the base TTL (30s), 
 * the system detects "Excessive Polling" and extends the cache life 
 * to 5 minutes to protect the primary database.
 * 
 * @returns [parsedData, statusMessage]
 */
  async cacheReportAnalytics(key: string, data: any) {
    // cache for 10s
    const analytics_report_key = ReportsRedis.REPORT_ANALYTICS_KEY + key;
    const res_2 = await this.redisClient.set(
      analytics_report_key,
      JSON.stringify(data),
      {
        expiration: { type: "EX", value: ReportsRedis.REPORT_ANALYTICS_EXPIRY },
      }
    );
    return Number(res_2);
  }

  async getCachedReportAnalytics(
    key: string
  ): Promise<[unknown, string | null]> {
    // redis keys
    const analytics_report_key = ReportsRedis.REPORT_ANALYTICS_KEY + key;
    const req_analytics_count_key = `req_analytics_count:${key}`;

    // get values
    const [analytics_report, ttl, request_count] = await this.redisClient
      .multi()
      .get(analytics_report_key)
      .ttl(analytics_report_key)
      .get(req_analytics_count_key)
      .exec();

    // convert to number if not
    const request_count_num = Number(request_count);
    const ttl_num = Number(ttl);

    // console.error(`ttl: ${ttl_num} | request count: ${request_count_num}`);

    // If report ttl is less or equal to required ttl
    // and request_count is less than 3 times
    // increment count
    // first  request_count_num = nothing and this.redisClient.incr do nothing
    // second request_count_num = 0 and incr to 1
    // third request_count_num = 1 and incr to 2
    // fourth block as 2<2 is false
    if (
      ttl_num <= ReportsRedis.REPORT_ANALYTICS_EXPIRY &&
      request_count_num < 2
    ) {
      await this.redisClient.incr(req_analytics_count_key);

      // One time apply
      if (!request_count_num) {
        await this.redisClient.expire(req_analytics_count_key, ttl_num);
      }
    }

    if (!analytics_report) {
      return [null, null];
    }

    // If analytics_report key expiry is less then or equal 10 sec and
    // request count is greater than 5 set analytics_report expiry key
    // to 5 mins.
    // first request_count_num = nothing
    // second request_count_num = 0
    // third request_count_num = 1
    // 1 >= 1 true so, increase expiry of analytics report cache to 5mins
    if (
      ttl_num <= ReportsRedis.REPORT_ANALYTICS_EXPIRY &&
      request_count_num >= 1
    ) {
      await this.redisClient.expire(
        analytics_report_key,
        ReportsRedis.REPORT_INVALID_BULK_REQUEST_EXPIRY
      );
    }

    const message =
      ttl_num >= ReportsRedis.REPORT_ANALYTICS_EXPIRY
        ? `Request cached for ${ttl}s due to excessive repeated requests.`
        : "";
    return [JSON.parse(analytics_report as unknown as string), message]; // parse already stringified value
  }

  async cacheSingleReportById(key: string, data: unknown): Promise<unknown> {
    return await this.redisClient.set(
      ReportsRedis.SINGLE_REPORTS_CACHE_KEY + key,
      JSON.stringify(data),
      { expiration: { type: "EX", value: ReportsRedis.SINGLE_REPORT_EXPIRY } }
    );
  }

  /**
 * Deletes a specific report from the cache.
 * Correctly applies the internal prefix.
 */
  async deleteSingleReportCache(key: string): Promise<unknown> {
    return await this.redisClient.del(key);
  }

  /**
 * Flushes the main report-related keys.
 */
  async clearReportsAllCache(): Promise<unknown> {
    await this.redisClient.del([
      ReportsRedis.REPORTS_CACHE_KEY,
      ReportsRedis.REPORTS_COUNT_CACHE_KEY,
      ReportsRedis.REPORT_ANALYTICS_KEY,
    ]);
    return;
  }
}
