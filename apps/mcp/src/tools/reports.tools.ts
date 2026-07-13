import { oauthMetadataResponse, type ListResourcesCallback, type McpServer, type ReadResourceCallback, type ResourceLink } from "@modelcontextprotocol/server";
import { reportZSchema } from "@repo/zod"
import { REPORT_PREDICTION_PROMPT } from "@/constant-prompts";
import { reportsTable, usersTable, type PgReportsSelectType } from "@repo/database"
import { postgres } from "@/lib/db.connect";
import z4 from "zod/v4";
import { generateText } from "ai"

import { eq } from "drizzle-orm";
import { convertToValidJson, groq } from "@repo/shared";

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

                            ${REPORT_PREDICTION_PROMPT}`
            })

            if (!text) {

                return {
                    content: [
                        {
                            type: "text",
                            text: "AI classification failed. Please try again!"
                        }
                    ],
                    isError: true
                }

            }

            try {
                const predicted_data: Pick<PgReportsSelectType, "confidence" | "category" | "suggested_action" | "urgency" | "summary"> = convertToValidJson(text)

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



                return {
                    content: [
                        {
                            type: "text",
                            text: "Report has been submitted successfully",
                        }
                    ],

                    structuredContent: { user_id, report_id },
                }


            } catch (error) {
                console.error(error)
                return {
                    content: [
                        {
                            type: "text",
                            text: "Failed to submit report!"
                        }
                    ],
                    isError: true
                }

            }


        })

    }

    allReports() {
        this.server.registerResource("all-reports", "reports://all", {
            title: "All reports",
            description: "Returns all submitted incident reports, including reporter contact, location, category, and description. Useful for reviewing report history or checking for duplicates.",
            mimeType: "application/json",
        }, async (uri) => {
            try {
                const prepareReports = postgres.select({
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
                        role: usersTable.role
                    }
                })
                    .from(reportsTable)
                    .leftJoin(usersTable, eq(reportsTable.user, usersTable.id)).prepare("get_all_reports");

                const reports = await prepareReports.execute()

                if (reports.length > 0) {
                    return {
                        contents: [
                            { uri: uri.href, text: JSON.stringify(reports), mimeType: "application/json" },
                        ],
                    };

                }

                return {
                    contents: [
                        { uri: uri.href, text: "There is no reports!", },
                    ],
                };

            } catch (error) {
                return {
                    contents: [
                        { uri: uri.href, text: "Failed to get reports!" },
                    ],
                };

            }
        })
    }

    init() {
        this.registerCreateReport()
        this.allReports()
    }
}
