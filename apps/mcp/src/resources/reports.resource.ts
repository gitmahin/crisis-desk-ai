import { reportsTable, usersTable } from "@repo/database";
import { postgres } from "@/lib/db.connect";
import { and, eq, sql, SQL } from "drizzle-orm";
import { McpRegistrar } from "@/blueprints";
import { MCPResourceResponse } from "@/lib/resource-response";
import { asyncResourceHandler } from "@/lib";
import { ResourceTemplate } from "@modelcontextprotocol/server";
import { reportRedis } from "@/redis/report.redis";
import { connectRedis } from "@/lib/redis";
import { MCPResourceException } from "@/lib/exceptions-handlers";

export class ReportResources extends McpRegistrar {
  registerAllReports() {
    this.server.registerResource(
      "all-reports",
      new ResourceTemplate('reports://all/{page}/{category}/{urgency}', { list: undefined }),
      {

        title: "All reports",
        description:
          "Returns all submitted incident reports, including reporter contact, location, category, and description. Useful for reviewing report history or checking for duplicates.",
        mimeType: "application/json",

      },
      asyncResourceHandler(allReports)
    );
  }

  registerGetReportById() {
    this.server.registerResource(
      "get-report-by-id",
      new ResourceTemplate('reports://all/id/{id}', { list: undefined }),
      {
        title: "Get Incident Report by ID",
        description:
          "Returns the details of a specific incident report identified by its ID, including the reporter's information, location, category, description, status, timestamps, and any AI-generated analysis.",
        mimeType: "application/json",
      },
      asyncResourceHandler(getReportBySpecificId)
    );
  }
  init() {
    this.registerAllReports();
    this.registerGetReportById();
  }
}

const allReports = async (uri: URL, variables: any) => {
  const page = Number(variables.page) || 1;
  const category = variables.category !== 'none' ? variables.category : undefined;
  const urgency = variables.urgency !== 'none' ? variables.urgency : undefined;


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
  await reportRedis.cacheNReports(cache_data, 10)

  if (reports.length > 0) {
    return new MCPResourceResponse(uri.href, JSON.stringify(reports)).toObject()

  }

  return new MCPResourceResponse(uri.href, JSON.stringify({})).toObject()
}

const getReportBySpecificId = async (uri: URL, variables: any) => {

  const id = variables.id ?? ""

  const prepareGetReportById = postgres
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
    .where(eq(reportsTable.id, sql.placeholder("id")))
    .prepare("get_report_by_id");

  const [result] = await prepareGetReportById.execute({ id: id });

  if(!result) {
    throw new MCPResourceException("Report not found with the specific id.", uri.href)
  }

  return new MCPResourceResponse(uri.href, JSON.stringify(result)).toObject()

}