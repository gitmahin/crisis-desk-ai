import { postgres } from "@/libs";
import { reportsTable, usersTable } from "@repo/database";
import {
  validateWithZod,
  getSystemCustomErrorMsgByKey,
  ApiResponse,
  ApiError,
  convertToValidJson,
} from "@repo/shared";
import {
  reportZSchema,
  type GetReportByIdPayloadType,
  type UpdateReportPayloadType,
} from "@repo/zod";
import type { Request, Response } from "express";
import z4 from "zod/v4";
import { and, eq, SQL, sql } from "drizzle-orm";
import { mcpClient, transport } from "@/libs/mcp-client";
import { generateText, jsonSchema, type ToolSet } from "ai";
import "dotenv/config";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import { groq } from "@/libs/ai-models";
import { MODEL_CRN_HEADER_KEY } from "@repo/constants"
import { connectRedis } from "@/libs/redis";
import { reportsRedis } from "@/redis";
import { hash } from "node:crypto";
import { v4 as uuidv4 } from "uuid"

type DuplicateResponseDataType = {
  possibleDuplicate: boolean;
  matchedReportId: string;
};

export class ReportController {


  async createReport(req: Request, res: Response) {
    const payload = req.body;

    const model_crn = req.headers[MODEL_CRN_HEADER_KEY] as string

    const { data, success, error } = validateWithZod(
      payload,
      reportZSchema.createReport
    );

    if (!success) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("CREATE_REPORT_PAYLOAD_ERROR")!,
        "",
        [z4.flattenError(error)]
      );
    }

    await mcpClient.connect(transport);

    const { contents } = await mcpClient.readResource({ uri: "reports://all" });

    if (!contents[0]) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("RESOURCE_NOT_FOUND")!
      );
    }

    const resource_text = (contents[0] as { text: string }).text;

    if (!resource_text) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("RESOURCE_NOT_FOUND")!
      );
    }

    const resource_response = JSON.parse(resource_text);

    const { text: model_response } = await generateText({
      model: groq(model_crn ?? "openai/gpt-oss-20b"),
      instructions: `You are a duplicate incident report detector.

            You will be given:
            1. A list of existing reports (with their id, location, category, and description).
            2. A new incoming report to check against that list.

            A report is considered a possible duplicate if it describes the same real-world incident as an existing report — same or very similar location, same category, and a description referring to the same event (even if worded differently). Minor differences in wording, contact info, or timestamp do NOT rule out a duplicate.

            Existing reports:
            ${JSON.stringify(resource_response)}

            New incoming report:
            ${JSON.stringify(data)}

            Return ONLY a JSON object with this exact shape, no other text, no markdown formatting, no code fences:

            {
            "possibleDuplicate": boolean,
            "matchedReportId": string | null
            }

          Rules:
    - "possibleDuplicate" is true only if you find a clear match to an existing report.
    - "matchedReportId" must be the "id" field of the matched existing report, or null if no duplicate was found.
    - If multiple reports could match, return the closest/most likely match only.
    - If the existing reports list is empty, missing, null, not an array, or otherwise unusable/unavailable, you MUST return { "possibleDuplicate": false, "matchedReportId": null } — do not guess or treat this as an error.
    - If you are ever unsure, unable to compare, or anything goes wrong, default to { "possibleDuplicate": false, "matchedReportId": null }.
    - Always return valid JSON matching the exact shape above — no explanations, no prose, no markdown code blocks, under every circumstance.`,
      messages: [
        { role: "user", content: "Check if this new report is a duplicate." },
      ],
    });

    const parsed_model_response: DuplicateResponseDataType =
      convertToValidJson(model_response);

    if (parsed_model_response.possibleDuplicate) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("DUPLICATE_REPORT_FOUND")!,
        "",
        [parsed_model_response]
      );
    }

    const { tools } = await mcpClient.listTools();

    const groqTools = tools.reduce<ToolSet>(
      (obj, tool) => ({
        ...obj,
        [tool.name]: {
          description: tool.description,
          inputSchema: jsonSchema(tool.inputSchema),
          execute: async (args: Record<string, any>) => {
            return await mcpClient.callTool({
              name: tool.name,
              arguments: args,
            });
          },
        },
      }),
      {}
    );

    const { text, toolResults } = await generateText({
      model: groq(model_crn ?? "openai/gpt-oss-20b"),
      prompt: `Create new report with the following payload: ${JSON.stringify(data)}`,
      tools: groqTools,
    });

    // @ts-ignore
    const toolResult = toolResults[0]?.output as CallToolResult | undefined;
    console.error("here is the tool result", toolResult?.structuredContent);

    // @ts-ignore
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          // @ts-ignore
          text || toolResult?.content[0]?.text || "No response from AI",
          toolResult?.structuredContent
        )
      );
  }

  async updateReportStatus(req: Request, res: Response) {
    const body = req.body;
    const params = req.params;

    const payload: UpdateReportPayloadType = {
      id: params?.id as string,
      status: body?.status,
    };

    const { data, success, error } = validateWithZod(
      payload,
      reportZSchema.updateReportStatus
    );
    if (!success) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("UPDATE_REPORT_STS_PAYLOAD_ERROR")!,
        "",
        [z4.flattenError(error)]
      );
    }

    const [updatedReport] = await postgres
      .update(reportsTable)
      .set({ status: data.status })
      .where(eq(reportsTable.id, data.id))
      .returning();

    if (!updatedReport) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("REPORT_NOT_FOUND")!
      );
    }

    return res.status(200).json(new ApiResponse(200, "Report Updated."));
  }

  async getAllReports(req: Request, res: Response) {
    const queryParams = req.query;

    const { data, success, error } = validateWithZod(
      queryParams,
      reportZSchema.getReportByQueryParams
    );

    if (!success) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("GET_REPORT_BY_QUERY_PAYLOAD_ERROR")!,
        "",
        [z4.flattenError(error)]
      );
    }

    const filters: SQL[] = [];

    if (data.category)
      filters.push(
        // @ts-ignore
        eq(reportsTable.category, String(data.category).toUpperCase())
      );
    if (data.urgency)
      filters.push(
        eq(reportsTable.urgency, String(data.urgency).toUpperCase())
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
      .where(filters.length > 0 ? and(...filters) : undefined);

    // Don't return an error here. During filtering,
    // having no matching products is a valid result, not an error.
    return res.status(200).json(new ApiResponse(200, "OK", reports));
  }

  async getReportById(req: Request, res: Response) {
    const params = req.params;
    const payload: GetReportByIdPayloadType = {
      id: params?.id as string,
    };

    const { data, success, error } = validateWithZod(
      payload,
      reportZSchema.getReportById
    );

    if (!success) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("GET_REPORT_BY_ID_PAYLOAD_ERROR")!,
        "",
        [z4.flattenError(error)]
      );
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
          role: usersTable.role,
        },
      })
      .from(reportsTable)
      .leftJoin(usersTable, eq(reportsTable.user, usersTable.id))
      .where(eq(reportsTable.id, sql.placeholder("id")))
      .prepare("get_report_by_id");

    const [result] = await prepareGetReportById.execute({ id: data.id });
    if (!result) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("REPORT_NOT_FOUND")!
      );
    }
    return res.status(200).json(new ApiResponse(200, "OK", result));
  }

  async deleteReportById(req: Request, res: Response) {
    const params = req.params;
    const payload: GetReportByIdPayloadType = {
      id: params?.id as string,
    };

    const { data, success, error } = validateWithZod(
      payload,
      reportZSchema.getReportById
    );

    if (!success) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("GET_REPORT_BY_ID_PAYLOAD_ERROR")!,
        "",
        [z4.flattenError(error)]
      );
    }

    const [deletedReport] = await postgres
      .delete(reportsTable)
      .where(eq(reportsTable.id, data.id))
      .returning();

    if (!deletedReport) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("REPORT_NOT_FOUND")!
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Report deleted successfully", deletedReport.id)
      );
  }

  async getReportsAnalyticsSummary(req: Request, res: Response) {

    // Check if user pass specific model_crn
    const model_crn = req.headers[MODEL_CRN_HEADER_KEY] as string

    // Check if there is any cache based on the user ip
    await connectRedis()

    const [cache_result, message] = await reportsRedis.getCachedReportAnalytics(req.clientIp as string)

    if (cache_result) {
      return res.status(200).json(new ApiResponse(200, message ? `OK with WARNING: ${message}` : "OK", cache_result));
    }

    await mcpClient.connect(transport);

    const { contents } = await mcpClient.readResource({ uri: "reports://all" });

    if (!contents[0]) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("RESOURCE_NOT_FOUND")!
      );
    }

    const resource_text = (contents[0] as { text: string }).text;

    if (!resource_text) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("RESOURCE_NOT_FOUND")!
      );
    }

    const data = JSON.parse(resource_text);

    const { text } = await generateText({
      model: groq(model_crn ?? "openai/gpt-oss-20b"),
      instructions: `You are an incident report analytics engine.
 
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
                             - Return valid JSON only — no explanations, no prose, no markdown code blocks.`,
      messages: [
        {
          role: "user",
          content: "Give me the current report statistics.",
        },
      ],
    });

    const valid_model_output = convertToValidJson(text);
    await reportsRedis.cacheReportAnalytics(req.clientIp as string, valid_model_output)

    return res.status(200).json(new ApiResponse(200, "OK", valid_model_output));
  }
}
