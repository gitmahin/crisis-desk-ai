import { reportsTable, usersTable } from "@repo/database";
import { postgres } from "@/lib/db.connect";
import { and, eq, SQL } from "drizzle-orm";
import { McpRegistrar } from "@/blueprints";
import { MCPResourceResponse } from "@/lib/resource-response";
import { asyncResourceHandler } from "@/lib";
import { ResourceTemplate } from "@modelcontextprotocol/server";
import { reportRedis } from "@/redis/report.redis";
import { connectRedis } from "@/lib/redis";

export class ReportResources extends McpRegistrar {
  registerAllReports() {
    this.server.registerResource(
      "all-reports",
      new ResourceTemplate('reports://all', { list: undefined }),
      {

        title: "All reports",
        description:
          "Returns all submitted incident reports, including reporter contact, location, category, and description. Useful for reviewing report history or checking for duplicates.",
        mimeType: "application/json",

      },
      asyncResourceHandler(allReports)
    );
  }
  init() {
    this.registerAllReports();
  }
}

const allReports = async (uri: URL) => {
  const page = Number( uri.searchParams.get('category')) || 1;
  const category = uri.searchParams.get('category') ?? undefined;
  const urgency = uri.searchParams.get('urgency') ?? undefined;

  console.log(`page: ${page} | cat: ${category} | urgency: ${urgency}`)


  const limit = 20;
  const offset = (page - 1) * limit;
  const cache_key = "reports:" + page + ":"

  const cache_keys = Array.from({ length: limit }).map((item, i) => cache_key + i)
  console.log("cache keys", cache_keys)
  await connectRedis()
  const cache_reports = await reportRedis.getNReports(cache_keys)

  const hits = cache_reports.filter((r): r is string => r != null)

  if (hits.length > 0) {
    const parsed = hits.map((r) => JSON.parse(r))
    return new MCPResourceResponse(uri.href, JSON.stringify(parsed)).toObject()
  }

  const filters: SQL[] = [];

  if (category)
    filters.push(
      // @ts-ignore
      eq(reportsTable.category, String(category).toUpperCase())
    );
  if (urgency)
    filters.push(
      eq(reportsTable.urgency, String(urgency).toUpperCase())
    );


  const reports = await postgres
    .select({
      id: reportsTable.id,
      location: reportsTable.location,
      geo_location: reportsTable.geo_location,
      language: reportsTable.language,
      description: reportsTable.description,
      category: reportsTable.category,
      urgency: reportsTable.urgency,
      summary: reportsTable.summary,
      suggested_action: reportsTable.suggested_action,
      confidence: reportsTable.confidence,
      status: reportsTable.status,
      created_at: reportsTable.created_at,
      updated_at: reportsTable.updated_at,
      user: {
        id: usersTable.id,
        name: usersTable.name,
        contact: usersTable.contact,
        role: usersTable.role,
      },
    })
    .from(reportsTable)
    .leftJoin(usersTable, eq(reportsTable.user, usersTable.id))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .limit(limit)
    .offset(offset)


  console.log("reports here", reports)



  await connectRedis()
  const cache_data: [string, string][] = reports.map((item, i) => [cache_key + i, JSON.stringify(item)]);
  await reportRedis.cacheNReports(cache_data, 2*60)

  if (reports.length > 0) {
    return new MCPResourceResponse(uri.href, JSON.stringify(reports)).toObject()

  }

  return new MCPResourceResponse(uri.href, JSON.stringify({})).toObject()
}