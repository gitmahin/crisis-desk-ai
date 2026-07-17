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
import { connectRedis, reportRedis } from "@/libs/redis";
import { hash } from "node:crypto";
import { v4 as uuidv4 } from "uuid"

type DuplicateResponseDataType = {
  possibleDuplicate: boolean;
  matchedReportId: string;
};

export class ReportController {


  // async createReport(req: Request, res: Response) {

  //   const { text: model_response } = await generateText({
  //     model: groq(model_crn ?? "openai/gpt-oss-20b"),
  //     instructions: `You are a duplicate incident report detector.

  //           You will be given:
  //           1. A list of existing reports (with their id, location, category, and description).
  //           2. A new incoming report to check against that list.

  //           A report is considered a possible duplicate if it describes the same real-world incident as an existing report — same or very similar location, same category, and a description referring to the same event (even if worded differently). Minor differences in wording, contact info, or timestamp do NOT rule out a duplicate.

  //           Existing reports:
  //           ${JSON.stringify(resource_response)}

  //           New incoming report:
  //           ${JSON.stringify(data)}

  //           Return ONLY a JSON object with this exact shape, no other text, no markdown formatting, no code fences:

  //           {
  //           "possibleDuplicate": boolean,
  //           "matchedReportId": string | null
  //           }

  //         Rules:
  //   - "possibleDuplicate" is true only if you find a clear match to an existing report.
  //   - "matchedReportId" must be the "id" field of the matched existing report, or null if no duplicate was found.
  //   - If multiple reports could match, return the closest/most likely match only.
  //   - If the existing reports list is empty, missing, null, not an array, or otherwise unusable/unavailable, you MUST return { "possibleDuplicate": false, "matchedReportId": null } — do not guess or treat this as an error.
  //   - If you are ever unsure, unable to compare, or anything goes wrong, default to { "possibleDuplicate": false, "matchedReportId": null }.
  //   - Always return valid JSON matching the exact shape above — no explanations, no prose, no markdown code blocks, under every circumstance.`,
  //     messages: [
  //       { role: "user", content: "Check if this new report is a duplicate." },
  //     ],
  //   });

  //   const parsed_model_response: DuplicateResponseDataType =
  //     convertToValidJson(model_response);

  //   if (parsed_model_response.possibleDuplicate) {
  //     throw new ApiError(
  //       400,
  //       getSystemCustomErrorMsgByKey("DUPLICATE_REPORT_FOUND")!,
  //       "",
  //       [parsed_model_response]
  //     );
  //   }

  //   const { tools } = await mcpClient.listTools();

  //   const groqTools = tools.reduce<ToolSet>(
  //     (obj, tool) => ({
  //       ...obj,
  //       [tool.name]: {
  //         description: tool.description,
  //         inputSchema: jsonSchema(tool.inputSchema),
  //         execute: async (args: Record<string, any>) => {
  //           return await mcpClient.callTool({
  //             name: tool.name,
  //             arguments: args,
  //           });
  //         },
  //       },
  //     }),
  //     {}
  //   );

  //   const { text, toolResults } = await generateText({
  //     model: groq(model_crn ?? "openai/gpt-oss-20b"),
  //     prompt: `Create new report with the following payload: ${JSON.stringify(data)}`,
  //     tools: groqTools,

  //   });

  //   // @ts-ignore
  //   const toolResult = toolResults[0]?.output as CallToolResult | undefined;
  //   console.error("here is the tool result", toolResults, text);

  //   if (toolResult?.isError) {
  //     const error = toolResult._meta?.error
  //     // @ts-ignore
  //     throw new ApiError(400, { title: "", message: error.message, code: error.code })
  //   }
  //   // @ts-ignore
  //   const valid_data = convertToValidJson(toolResult?.content[0]?.text)

  //   // @ts-ignore
  //   return res
  //     .status(201)
  //     .json(
  //       new ApiResponse(
  //         201,
  //         // @ts-ignore
  //         valid_data || "No response from AI",
  //         toolResult?.structuredContent
  //       )
  //     );
  // }

  async updateReport(req: Request, res: Response) {
    return res.status(200).json(new ApiResponse(200, "Report Updated."));
  }

  async getAllReports(req: Request, res: Response) {
    // Don't return an error here. During filtering,
    // having no matching products is a valid result, not an error.
    return res.status(200).json(new ApiResponse(200, "OK", req.resourceResult));

  }

  async getReportById(req: Request, res: Response) {

    return res.status(200).json(new ApiResponse(200, "OK", req.resourceResult));
  }

  async deleteReportById(req: Request, res: Response) {

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Report deleted successfully", req.toolResult)
      );
  }

  async getReportsAnalyticsSummary(req: Request, res: Response) {
    await reportRedis.cacheReportAnalytics(req.clientIp as string, req.resourceResult)
    return res.status(200).json(new ApiResponse(200, "OK", req.resourceResult));
  }
}
