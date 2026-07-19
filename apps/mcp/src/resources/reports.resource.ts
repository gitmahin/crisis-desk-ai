import { reportsTable, usersTable } from "@repo/database";
import { postgres } from "@/lib/db.connect";
import { and, eq, sql, SQL } from "drizzle-orm";
import { McpRegistrar } from "@/blueprints";
import { MCPResourceResponse } from "@/lib/resource-response";
import { asyncResourceHandler, mongoConnect } from "@/lib";
import {
  ResourceTemplate,
  type ReadResourceCallback,
  type ReadResourceTemplateCallback,
} from "@modelcontextprotocol/server";
import { redisClient, reportRedis } from "@/lib/redis";
import { connectRedis } from "@/lib/redis";
import { MCPResourceException } from "@/lib/exceptions-handlers";
import { getPreparedReportStats } from "@/prepared-statements";
import { SystemCustomErrorCode } from "@repo/shared";
import { reportEmbedding } from "@/rag";

export class ReportResources extends McpRegistrar {
  registerAllReports() {
    this.server.registerResource(
      "all-reports",
      new ResourceTemplate("reports://all/{page}/{category}/{urgency}", {
        list: undefined,
      }),
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
      new ResourceTemplate("reports://all/id/{id}", { list: undefined }),
      {
        title: "Get Incident Report by ID",
        description:
          "Returns the details of a specific incident report identified by its ID, including the reporter's information, location, category, description, status, timestamps, and any AI-generated analysis.",
        mimeType: "application/json",
      },
      asyncResourceHandler(getReportBySpecificId)
    );
  }

  registerGetReportAnalytics() {
    this.server.registerResource(
      "get-report-analytics",
      "reports://analytics",
      {
        title: "Get Incident Report Analytics",
        description:
          "Returns aggregated analytics for incident reports, including report counts, category and status distributions, urgency levels, reporting trends, and other summary metrics for monitoring and operational insights.",
        mimeType: "application/json",
      },
      asyncResourceHandler(getReportAnalyticsSummary)
    );
  }

  registerGetSimiliarReports() {
    this.server.registerResource(
      "get-similar-reports",
      new ResourceTemplate("reports://similar/{query}/", { list: undefined }),
      {
        title: "Get Similar Incident Reports",
        description:
          "Returns incident reports that are similar to a given report based on factors such as category, description, location, and other relevant attributes to help identify related or duplicate incidents.",
        mimeType: "application/json",
      },
      asyncResourceHandler(getSimilarReports)
    );
  }

  init() {
    this.registerAllReports();
    this.registerGetReportById();
    this.registerGetReportAnalytics();
    this.registerGetSimiliarReports();
  }
}

const allReports: ReadResourceTemplateCallback = async (uri, variables) => {
  const page = Number(variables.page) || 1;
  const category =
    variables.category !== "none" ? variables.category : undefined;
  const urgency = variables.urgency !== "none" ? variables.urgency : undefined;

  // console.log(`page: ${page} | cat: ${category} | urgency: ${urgency}`);

  const limit = 20;
  const offset = (page - 1) * limit;

  await connectRedis();
  const cache_reports = await reportRedis.getNReports(page);
  const cache_result = cache_reports.filter((r): r is string => r !== null);
  if (cache_result.length > 0) {
    const parsed = cache_reports.map((r) => JSON.parse(r as string));
    return new MCPResourceResponse(uri.href, JSON.stringify(parsed)).toObject();
  }

  const filters: SQL[] = [];

  if (category)
    filters.push(
      // @ts-ignore
      eq(reportsTable.category, String(category).toUpperCase())
    );
  if (urgency)
    filters.push(eq(reportsTable.urgency, String(urgency).toUpperCase()));

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
    .offset(offset);

  // console.log("reports here", reports);

  await connectRedis();
  // console.log("redis response", await redisClient.ping());
  await reportRedis.cacheNReports(reports, page, 30);

  if (reports.length > 0) {
    return new MCPResourceResponse(
      uri.href,
      JSON.stringify(reports)
    ).toObject();
  }

  return new MCPResourceResponse(uri.href, JSON.stringify({})).toObject();
};

const getReportBySpecificId: ReadResourceTemplateCallback = async (
  uri,
  variables
) => {
  const id = variables.id ?? "";

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

  if (!result) {
    throw new MCPResourceException(
      "Report not found with the specific id.",
      uri.href,
      SystemCustomErrorCode.REPORT_NOT_FOUND,
      404
    );
  }

  return new MCPResourceResponse(uri.href, JSON.stringify(result)).toObject();
};

const getReportAnalyticsSummary: ReadResourceCallback = async (uri) => {
  const preparedReport = await getPreparedReportStats();
  const [result] = await preparedReport.execute();
  if (!result) {
    throw new MCPResourceException("No stats.", uri.href, "", 404);
  }

  const data = {
    totalReports: result.totalReports,
    criticalReports: result.criticalReports,
    pendingReports: result.pendingReports,
    resolvedReports: result.resolvedReports,
    categoryBreakdown: {
      fire: result.fire,
      medical: result.medical,
      flood: result.flood,
      utility: result.utility,
      accident: result.accident,
      crime: result.crime,
      publicService: result.publicService,
      infrastructure: result.infrastructure,
      other: result.other,
    },
    urgencyBreakdown: {
      low: result.low,
      medium: result.medium,
      high: result.high,
      critical: result.critical,
    },
  };

  return new MCPResourceResponse(uri.href, JSON.stringify(data)).toObject();
};

const getSimilarReports: ReadResourceTemplateCallback = async (
  uri,
  variables
) => {
  const query = decodeURIComponent(variables.query as string);
  // console.log("query is here", query);
  await mongoConnect();
  const response = await reportEmbedding.getResponseFromVectorSearch(
    query as string
  );
  return new MCPResourceResponse(uri.href, JSON.stringify(response)).toObject();
};
