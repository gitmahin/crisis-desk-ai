import {
  oauthMetadataResponse,
  type ListResourcesCallback,
  type McpServer,
  type ReadResourceCallback,
  type ResourceLink,
} from "@modelcontextprotocol/server";
import { reportZSchema } from "@repo/zod";
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

export class ReportTools extends McpRegistrar {
  registerCreateReport() {
    this.server.registerTool(
      "create-new-report",
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
      async (payload) => {
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
          return {
            content: [
              {
                type: "text",
                text: "AI classification failed. Please try again!",
              },
            ],
            isError: true,
          };
        }

        try {
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
              }

              const [report] = await tx
                .insert(reportsTable)
                .values({
                  user: user?.id,
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

          return {
            content: [
              {
                type: "text",
                text: "Report has been submitted successfully",
              },
            ],

            structuredContent: { user_id, report_id },
          };
        } catch (error) {
          console.error(error);
          return {
            content: [
              {
                type: "text",
                text: "Failed to submit report!",
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  init() {
    this.registerCreateReport();
  }
}
