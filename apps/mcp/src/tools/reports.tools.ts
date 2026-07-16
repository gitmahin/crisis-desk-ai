import {
  oauthMetadataResponse,
  type ListResourcesCallback,
  type McpServer,
  type ReadResourceCallback,
  type ResourceLink,
  type ServerContext,
} from "@modelcontextprotocol/server";
import { reportZSchema, type CreateReportPayloadType } from "@repo/zod";
import { REPORT_PREDICTION_PROMPT } from "@/constant-prompts";
import {
  reportsTable,
  usersTable,
  type PgReportsSelectType,
} from "@repo/database";
import { postgres } from "@/lib/db.connect";
import z4 from "zod/v4";
import { generateText } from "ai";

import { eq } from "drizzle-orm";
import { convertToValidJson } from "@repo/shared";
import { McpRegistrar } from "@/blueprints";
import { baseConfig } from "@/config";
import { groq } from "@/lib/ai-models";
import { asyncToolHandler } from "@/lib";
import { MCPToolException } from "@/lib/exception-handlers";
import { MCPToolResponse } from "@/lib/tool-response";



export class ReportTools extends McpRegistrar {
  static CREATE_NEW_REPORT = "create-new-report"
  registerCreateReport() {
    this.server.registerTool(
      ReportTools.CREATE_NEW_REPORT,
      {
        title: "Create new report",
        description: "Create new report based on the given value.",
        inputSchema: reportZSchema.createReport,
        annotations: {
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
          readOnlyHint: false,
        },
        outputSchema: z4.object({
          user_id: z4.string().nullable(),
          report_id: z4.string().nullable(),
        }),
      },
      asyncToolHandler(createReportTool)
    );
  }

  init() {
    this.registerCreateReport();
  }
}


const createReportTool = async (payload: CreateReportPayloadType, ctx: ServerContext) => {

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
      const [user] = await tx
        .insert(usersTable)
        .values({
          name: name,
          contact: contact,
        })
        .returning();

      if (!user) {
        tx.rollback();
        throw new MCPToolException("User not created", ReportTools.CREATE_NEW_REPORT)
      }

      const [report] = await tx
        .insert(reportsTable)
        .values({
          user: user.id,
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

      return [String(user?.id), String(report?.id)];
    }
  );

  return new MCPToolResponse(
    "Report has been submitted successfully",
    { user_id, report_id }
  ).toObject();

}