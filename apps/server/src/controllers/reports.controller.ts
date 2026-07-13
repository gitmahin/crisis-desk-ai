import { postgres } from "@/libs";
import { asyncHandler } from "@/utils"
import { reportsTable, usersTable } from "@repo/database";
import { validateWithZod, getSystemCustomErrorMsgByKey, ApiResponse, ApiError, groq, convertToValidJson, } from "@repo/shared"
import { reportZSchema, type GetReportByIdPayloadType, type UpdateReportPayloadType } from "@repo/zod"
import type { Request, Response } from "express"
import z4 from "zod/v4";
import { and, eq, SQL, sql } from "drizzle-orm"
import { mcpClient, transport } from "@/libs/mcp-client";
import { generateText } from "ai"
import "dotenv/config"


export class ReportController {

    async createReport(req: Request, res: Response) {
        const payload = req.body;

        const { data, success, error } = validateWithZod(payload, reportZSchema.createReport)

        if (!success) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("CREATE_REPORT_PAYLOAD_ERROR")!, "", [z4.flattenError(error)])
        }

        return res.status(201).json(new ApiResponse(201, "Report Created", { id: "report_id" }))

    }

    async updateReportStatus(req: Request, res: Response) {
        const body = req.body
        const params = req.params

        const payload: UpdateReportPayloadType = {
            id: params?.id as string,
            status: body?.status
        }

        const { data, success, error } = validateWithZod(payload, reportZSchema.updateReportStatus)
        if (!success) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("UPDATE_REPORT_STS_PAYLOAD_ERROR")!, "", [z4.flattenError(error)])
        }

        return res.status(200).json(new ApiResponse(200, "Report Updated"))

    }


    async getAllReports(req: Request, res: Response) {
        const queryParams = req.query

        const { data, success, error } = validateWithZod(queryParams, reportZSchema.getReportByQueryParams)

        if (!success) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("GET_REPORT_BY_QUERY_PAYLOAD_ERROR")!, "", [z4.flattenError(error)])
        }

        const filters: SQL[] = [];

        if (data.category) filters.push(eq(reportsTable.category, data.category));
        if (data.urgency) filters.push(eq(reportsTable.urgency, data.urgency));

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
                    role: usersTable.role
                }
            })
            .from(reportsTable)
            .leftJoin(usersTable, eq(reportsTable.user, usersTable.id))
            .where(filters.length > 0 ? and(...filters) : undefined);

        // Don't return an error here. During filtering, 
        // having no matching products is a valid result, not an error.
        return res.status(200).json(new ApiResponse(200, "OK", reports))


    }

    async getReportById(req: Request, res: Response) {
        const params = req.params
        const payload: GetReportByIdPayloadType = {
            id: params?.id as string
        }

        const { data, success, error } = validateWithZod(payload, reportZSchema.getReportById)

        if (!success) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("GET_REPORT_BY_ID_PAYLOAD_ERROR")!, "", [z4.flattenError(error)])
        }

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
                    role: usersTable.role
                }
            })
            .from(reportsTable)
            .leftJoin(usersTable, eq(reportsTable.user, usersTable.id))
            .where(eq(reportsTable.id, sql.placeholder('id'))).prepare("get_report_by_id")

        const [result] = await prepareGetReportById.execute({ id: data.id })
        if (!result) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("REPORT_NOT_FOUND")!)
        }


        return res.status(200).json(new ApiResponse(200, "OK", result))


    }



    async deleteReportById(req: Request, res: Response) {
        const params = req.params
        const payload: GetReportByIdPayloadType = {
            id: params?.id as string
        }

        const { data, success, error } = validateWithZod(payload, reportZSchema.getReportById)

        if (!success) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("GET_REPORT_BY_ID_PAYLOAD_ERROR")!, "", [z4.flattenError(error)])
        }

        const [deletedReport] = await postgres
            .delete(reportsTable)
            .where(eq(reportsTable.id, data.id))
            .returning();

        if (!deletedReport) {
            throw new ApiError(404, getSystemCustomErrorMsgByKey("REPORT_NOT_FOUND")!);
        }

        return res.status(200).json(new ApiResponse(200, "Report deleted successfully", deletedReport.id));


    }

    async getReportsAnalyticsSummary(req: Request, res: Response) {

        await mcpClient.connect(transport)

        const { contents } = await mcpClient.readResource({ uri: "reports://all" })

        if (!contents[0]) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("RESOURCE_NOT_FOUND")!);
        }

        const data = JSON.parse(contents[0].text)

        if (!data) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("RESOURCE_NOT_FOUND")!);
        }

        const response = await groq.chat.completions.create({
            model: "openai/gpt-oss-20b",
            response_format: { type: "json_object" },
            messages: [{
                role: "system",
                content: `You are an incident report analytics engine.
 
                             You have access to the following incident report data:
 
                             ${JSON.stringify(data)}
 
                             Analyze the data and return ONLY a JSON object with this exact shape, no other text, no markdown formatting, no code fences:
 
                             {
                                "totalReports": number,
                                "criticalReports": number,
                                "pendingReports": number,
                                "resolvedReports": number,
                                "categoryBreakdown": {
                                    "fire": number,
                                    "medical": number,
                                    "flood": number,
                                    "utility": number
                                },
                                "urgencyBreakdown": {
                                    "low": number,
                                    "medium": number,
                                    "high": number,
                                    "critical": number
                                }
                             }
 
                             Rules:
                             - "criticalReports" counts reports where urgency is "CRITICAL".
                             - "pendingReports" counts reports where status is "PENDING".
                             - "resolvedReports" counts reports where status is "RESOLVED".
                             - "categoryBreakdown" and "urgencyBreakdown" must count every report, grouped by their respective field.
                             - If a category or urgency value has zero reports, still include it with value 0.
                             - Return valid JSON only — no explanations, no prose, no markdown code blocks.`
            },
            {
                role: "user",
                content: "Give me the current report statistics."
            }]
        })

        const text = response.choices[0]?.message.content || ""
        const valid_model_output = convertToValidJson(text)

        return res.status(200).json(new ApiResponse(200, "OK", valid_model_output))
    }



}
