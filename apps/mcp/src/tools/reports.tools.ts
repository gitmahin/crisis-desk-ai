import {
  reportZSchema,
  type CreateReportPayloadType,
  type GetReportByIdPayloadType,
  type UpdateReportPayloadType,
} from "@repo/zod";
import { REPORT_PREDICTION_PROMPT } from "@/constant-prompts";
import {
  reportsTable,
  usersTable,
  type PgReportsSelectType,
} from "@repo/database";
import { postgres } from "@/lib/db.connect";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import {
  convertToValidJson,
  getSystemCustomErrorMsgByKey,
  SystemCustomErrorCode,
} from "@repo/shared";
import { McpRegistrar } from "@/blueprints";
import { groq } from "@/lib/ai-models";
import { asyncToolHandler, mongoConnect } from "@/lib";
import { MCPToolResponse } from "@/lib/tool-response";
import { MCPToolException } from "@/lib/exceptions-handlers";
import { connectRedis, reportRedis } from "@/lib/redis";
import {
  CREATE_NEW_REPORT_TOOL_NAME,
  DELETE_REPORT_TOOL_NAME,
  UPDATE_REPORT_TOOL_NAME,
} from "@repo/constants";
import { reportModel, type ReportType } from "@/models/report-model";
import { reportEmbedding } from "@/rag";

type DuplicateResponseDataType = {
  possibleDuplicate: boolean;
  matchedReportId: string;
};

/**
 * Registrar for MCP Tools related to Incident Reporting.
 *
 * Provides an interface for the AI to create, update, and delete reports.
 * These tools allow the AI to move from being a "passive observer" to an
 * "active participant" in crisis management.
 */
export class ReportTools extends McpRegistrar {
  static CREATE_NEW_REPORT = CREATE_NEW_REPORT_TOOL_NAME;
  static UPDATE_REPORT = UPDATE_REPORT_TOOL_NAME;
  static DELETE_REPORT = DELETE_REPORT_TOOL_NAME;

  /**
   * Registers the tool for report creation.
   * Includes AI classification and vector search synchronization.
   */
  registerCreateReport() {
    this.server.registerTool(
      ReportTools.CREATE_NEW_REPORT,
      {
        title: "Create New Incident Report",
        description: "Create new report based on the given value.",
        inputSchema: reportZSchema.createReport,
        annotations: {
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
          readOnlyHint: false,
        },
      },
      asyncToolHandler(createReportTool)
    );
  }

  /**
   * Registers the tool for updating existing reports.
   * Supports partial updates for any report field.
   */
  registerUpdateReport() {
    this.server.registerTool(
      ReportTools.UPDATE_REPORT,
      {
        title: "Update Incident Report",
        description:
          "Updates an existing incident report by its ID. You can modify fields such as the location, description, category, language, urgency, status, summary, suggested action, confidence, or geographic location.",
        inputSchema: reportZSchema.updateReport,
        annotations: {
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
          readOnlyHint: false,
        },
      },
      asyncToolHandler(updateReportTool)
    );
  }

  /**
   * Registers the tool for report deletion.
   * Performs a clean-up across PostgreSQL, MongoDB (Vector), and Redis (Cache).
   */
  registerDeleteReport() {
    this.server.registerTool(
      ReportTools.DELETE_REPORT,
      {
        title: "Delete Incident Report",
        description:
          "Deletes an existing incident report identified by its ID. Use this operation only when the report should be permanently removed.",
        inputSchema: reportZSchema.getReportById,
        annotations: {
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
          readOnlyHint: false,
        },
      },
      asyncToolHandler(deleteReportTool)
    );
  }

  /**
   * Orchestrates the registration of all report-related tools.
   */
  init() {
    this.registerCreateReport();
    this.registerUpdateReport();
    this.registerDeleteReport();
  }
}

/**
 * Logic for creating a new report.
 *
 * Process:
 * 1. AI Classification: Calls Groq/LLM to predict category, urgency, and summary.
 * 2. SQL Transaction:
 *    - Upserts the User (based on contact info).
 *    - Inserts the Report linked to that User.
 * 3. Vector Sync: Generates embeddings for the new report and stores them in MongoDB.
 *
 * @throws {MCPToolException} If AI classification fails or DB write fails.
 */
const createReportTool = async (payload: CreateReportPayloadType) => {
  // dont json.stringify it its already stringyfied
  const { contact, description, language, location, name } = payload;

  // Sampling is deprecated. So we have to call LLM directly
  // AI-Powered Data Enrichment
  const { text } = await generateText({
    model: groq("openai/gpt-oss-20b"),
    system: `You are a strict JSON-only incident deduplication and classification engine. Never include prose, markdown, or explanations - output raw JSON only.`,
    prompt: `TASK 1 — Duplicate Check:
            Compare the new report against existing reports. Flag "possibleDuplicate": true ONLY if it describes the same real-world incident (same/similar location AND same category AND matching event description). Minor differences in wording, contact info, or timestamp do NOT disqualify a match. If reports list is empty, invalid, or you're unsure, default to false.

            New report:
            - Name: ${name}
            - Contact: ${contact}
            - Location: ${location}
            - Description: ${description}
            - Language: ${language}

            TASK 2 — Classification (only if not a duplicate):
            ${REPORT_PREDICTION_PROMPT}

            Return ONLY this exact JSON shape and this task into one object:
            
            {
              "possibleDuplicate": boolean,
              "matchedReportId": string | null,
            }

            Rules:
            - If possibleDuplicate is false, matchedReportId must be null and classification fields must be populated.
            - Never return prose, markdown, or explanations — JSON only.`,
  });

  const parsed_model_response: DuplicateResponseDataType =
    convertToValidJson(text);
  console.log("here it is", parsed_model_response);

  const structured_event = getSystemCustomErrorMsgByKey(
    "DUPLICATE_REPORT_FOUND"
  );

  if (parsed_model_response.possibleDuplicate) {
    return new MCPToolResponse(
      structured_event?.message as string,
      parsed_model_response,
      400
    ).toObject();
  }

  if (!text) {
    throw new MCPToolException(
      "AI classification failed. Please try again!",
      ReportTools.CREATE_NEW_REPORT
    );
  }

  const predicted_data: Pick<
    PgReportsSelectType,
    "confidence" | "category" | "suggested_action" | "urgency" | "summary"
  > = convertToValidJson(text);

  /**
   * Transaction ensures that if the Vector Sync fails, the database entry
   * remains consistent or rolls back.
   */
  const [user_result, report_result] = await postgres.transaction(
    async (tx) => {
      const [exists_user] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.contact, contact));

      const db_user =
        exists_user ??
        (await tx.insert(usersTable).values({ name, contact }).returning())[0];

      const [report] = await tx
        .insert(reportsTable)
        .values({
          // @ts-ignore
          user: db_user!.id,
          description: description,
          location: location,
          language: String(language).toUpperCase(),
          category: String(predicted_data.category).toUpperCase(),
          confidence: predicted_data.confidence,
          suggested_action: predicted_data.suggested_action,
          urgency: String(predicted_data.urgency).toUpperCase(),
          summary: predicted_data.summary,
        })
        .returning();

      await mongoConnect();

      const data: ReportType = {
        category: report!.category,
        report_id: report!.id,
        summary: report!.summary ?? "",
        user_id: report!.id,
        created_at: report!.created_at,
      };

      await reportEmbedding.create(data);

      return [db_user, report];
    }
  );

  if (!user_result?.id && !report_result?.id) {
    throw new MCPToolException(
      "User or Report failed to create! Try Again.",
      ReportTools.CREATE_NEW_REPORT
    );
  }

  return new MCPToolResponse(
    "Report has been submitted successfully",
    { user_id: user_result?.id, report_id: report_result?.id },
    201
  ).toObject();
};

/**
 * Logic for updating an existing report.
 * Uses a dynamic update pattern to only modify fields provided in the payload.
 */
const updateReportTool = async (payload: UpdateReportPayloadType) => {
  const data = payload;

  const updateData = {
    location: data.location,
    geo_location: data.geo_location,
    language: data.language,
    description: data.description,
    category: data.category,
    urgency: data.urgency,
    summary: data.summary,
    suggested_action: data.suggested_action,
    confidence: data.confidence,
    status: data.status,
  };

  // Remove undefined values so they aren't included in the UPDATE
  const updates = Object.fromEntries(
    Object.entries(updateData).filter(([, value]) => value !== undefined)
  );

  const [updatedReport] = await postgres
    .update(reportsTable)
    .set(updates)
    .where(eq(reportsTable.id, data.id))
    .returning();
  if (!updatedReport) {
    throw new MCPToolException(
      "Couldn't update the report",
      ReportTools.DELETE_REPORT,
      SystemCustomErrorCode.REPORT_NOT_FOUND
    );
  }

  return new MCPToolResponse(
    "Report Updated.",
    updatedReport.id,
    200
  ).toObject();
};

/**
 * Logic for deleting a report.
 * Performs a "Fan-out" deletion to maintain referential integrity across
 * different storage engines (SQL, NoSQL, and Cache).
 */
const deleteReportTool = async (payload: GetReportByIdPayloadType) => {
  const data = payload;

  await mongoConnect();
  await connectRedis();

  /**
   * Parallel Execution: Deleting from 3 systems simultaneously
   * to minimize total latency.
   */
  const [[deletedReport]] = await Promise.all([
    postgres
      .delete(reportsTable)
      .where(eq(reportsTable.id, data.id))
      .returning(),
    reportModel.deleteMany({
      report_id: data.id,
    }),
    reportRedis.deleteSingleReportCache(data.id),
  ]);

  if (!deletedReport) {
    throw new MCPToolException(
      "Cannot delete the report.",
      ReportTools.DELETE_REPORT,
      SystemCustomErrorCode.REPORT_NOT_FOUND
    );
  }

  return new MCPToolResponse(
    "Report deleted successfully.",
    deletedReport.id,
    200
  ).toObject();
};
