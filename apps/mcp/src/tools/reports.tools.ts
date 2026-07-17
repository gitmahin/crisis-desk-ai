import { reportZSchema, type CreateReportPayloadType, type GetReportByIdPayloadType, type UpdateReportPayloadType } from "@repo/zod";
import { REPORT_PREDICTION_PROMPT } from "@/constant-prompts";
import {
  reportsTable,
  usersTable,
  type PgReportsSelectType,
} from "@repo/database";
import { postgres } from "@/lib/db.connect";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { convertToValidJson, ReportsRedis, SystemCustomErrorCode, validateWithZod } from "@repo/shared";
import { McpRegistrar } from "@/blueprints";
import { groq } from "@/lib/ai-models";
import { asyncToolHandler } from "@/lib";
import { MCPToolResponse } from "@/lib/tool-response";
import { MCPToolException } from "@/lib/exceptions-handlers";
import { connectRedis, redisClient, reportRedis } from "@/lib/redis";



export class ReportTools extends McpRegistrar {
  static CREATE_NEW_REPORT = "create-new-report"
  static UPDATE_REPORT = "update-report"
  static DELETE_REPORT = "delete-report"
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
        }
      },
      asyncToolHandler(createReportTool)
    );
  }

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
        }
      },
      asyncToolHandler(updateReportTool)
    );
  }

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
        }
      },
      asyncToolHandler(deleteReportTool)
    );
  }


  init() {
    this.registerCreateReport();
    this.registerUpdateReport()
  }
}


const createReportTool = async (payload: CreateReportPayloadType) => {

  const { contact, description, language, location, name } = payload;

  // Sampling is deprecated. So we have to call LLM directly
  const { text } = await generateText({
    model: groq("openai/gpt-oss-20b"),

    prompt: `You are an emergency incident classification AI.
                            Analyze the incident report below and classify it.

                            Input:
                            - Name: ${name}
                            - Contact: ${contact}
                            - Location: ${location}
                            - Description: ${description}
                            - Language: ${language}

                            ${REPORT_PREDICTION_PROMPT}`,
  });

  if (!text) {

    throw new MCPToolException("AI classification failed. Please try again!", ReportTools.CREATE_NEW_REPORT)
  }


  const predicted_data: Pick<
    PgReportsSelectType,
    | "confidence"
    | "category"
    | "suggested_action"
    | "urgency"
    | "summary"
  > = convertToValidJson(text);

  const [user_id, report_id] = await postgres.transaction(
    async (tx) => {

      const [exists_user] = await tx.select().from(usersTable).where(eq(usersTable.contact, contact))

      const db_user = exists_user ??
        (
          await tx
            .insert(usersTable)
            .values({ name, contact })
            .returning()
        )[0];


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

      return [db_user?.id, report?.id];
    }
  );

  if (!user_id && !report_id) {
    throw new MCPToolException("User or Report failed to create! Try Again.", ReportTools.CREATE_NEW_REPORT)
  }

  return new MCPToolResponse(
    "Report has been submitted successfully",
    { user_id, report_id }
  ).toObject();

}

const updateReportTool = async (payload: UpdateReportPayloadType) => {
  const { data, success, error } = validateWithZod(
    payload,
    reportZSchema.updateReport
  );

  if (!success) {
    throw new Error("Error updating the report. Verify that the report ID exists and that all provided input values are valid.", {
      cause: error
    })

  }

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
    throw new MCPToolException("Couldn't update the report", ReportTools.DELETE_REPORT, SystemCustomErrorCode.REPORT_NOT_FOUND)
  }

  return new MCPToolResponse("Report Updated.", updatedReport).toObject();
}

const deleteReportTool = async (payload: GetReportByIdPayloadType) => {
  const { data, success, error } = validateWithZod(
    payload,
    reportZSchema.getReportById
  );

  if (!success) {
    throw new Error("The report ID provided is invalid.", {
      cause: error
    })
  }

  const [deletedReport] = await postgres
    .delete(reportsTable)
    .where(eq(reportsTable.id, data.id))
    .returning();

  await connectRedis()
  await reportRedis.deleteSingleReportCache(data.id)

  if (!deletedReport) {
    throw new MCPToolException("No report was found with the provided ID. Please check the identifier and try again.", ReportTools.DELETE_REPORT, SystemCustomErrorCode.REPORT_NOT_FOUND)
  }

  return new MCPToolResponse("Report deleted successfully.", deletedReport.id).toObject();
}