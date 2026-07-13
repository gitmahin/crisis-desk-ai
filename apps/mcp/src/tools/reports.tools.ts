import type { McpServer } from "@modelcontextprotocol/server";
import { reportZSchema } from "@repo/zod"
import { REPORT_PREDICTION_PROMPT } from "@/constant-prompts";
import { ReturnMCPResponse } from "@/utils/mcp-return";
import { reportsTable, usersTable, type PgReportsSelectType } from "@repo/database"
import { postgres } from "@/lib/db.connect";
import z4 from "zod/v4";
import { groq } from "@/lib/groq";

export class ReportTools {
    private server: McpServer
    constructor(server: McpServer) {
        this.server = server
    }

    registerCreateReport() {
        this.server.registerTool("create-new-report", {
            title: "Create new report",
            description: "Create new report based on the given value.",
            inputSchema: reportZSchema.createReport,
            annotations: {
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: true,
                readOnlyHint: false
            },
            outputSchema: z4.object({
                user_id: z4.string().nullable(),
                report_id: z4.string().nullable()
            })

        }, async (payload) => {
            const { contact, description, language, location, name } = payload

            // Sampling is deprecated. So we have to call LLM directly
            const response = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `
                                You are an emergency incident classification AI.
                                Analyze the incident report below and classify it.

                                Input:
                                - Name: ${name}
                                - Contact: ${contact}
                                - Location: ${location}
                                - Description: ${description}
                                - Language: ${language}

                                ${REPORT_PREDICTION_PROMPT}`,
                    },
                ],
                model: "openai/gpt-oss-20b",
            });

            const text = response.choices[0]?.message.content || ""

            if (!text) {


                return ReturnMCPResponse("AI classification failed. Please try again!", undefined, true)

            }

            try {
                const predicted_data: Pick<PgReportsSelectType, "confidence" | "category" | "suggested_action" | "urgency" | "summary"> = JSON.parse(text.trim().replace(/^```json/, "").replace(/```$/, "").trim())

                const [user_id, report_id] = await postgres.transaction(async (tx) => {
                    const [user] = await tx.insert(usersTable).values({
                        name: name,
                        contact: contact,
                    }).returning()

                    if (!user) {
                        tx.rollback()
                    }

                    const [report] = await tx.insert(reportsTable).values({
                        user: user!.id,
                        description: description,
                        location: location,
                        language: String(language).toUpperCase(),
                        category: String(predicted_data.category).toUpperCase(),
                        confidence: predicted_data.confidence,
                        suggested_action: predicted_data.suggested_action,
                        urgency: String(predicted_data.urgency).toUpperCase(),
                        summary: predicted_data.summary
                    }).returning()

                    return [String(user?.id), String(report?.id)]
                })

                return ReturnMCPResponse("Report has been submitted successfully", { user_id, report_id })


            } catch (error) {
                console.log(error)
                return ReturnMCPResponse("Failed to submit report!", undefined, true)
            }


        })

    }



    init() {
        this.registerCreateReport()
    }
}
