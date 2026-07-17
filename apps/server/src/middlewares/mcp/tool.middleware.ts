import { groq } from "@/libs/ai-models";
import { mcpClient, transport } from "@/libs/mcp-client";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import { MODEL_CRN_HEADER_KEY, USE_AGENT_HEADER_KEY } from "@repo/constants";
import { ApiError, ApiResponse, getSystemCustomErrorMsgByKey, SystemCustomErrorMsgByCode } from "@repo/shared";
import { generateText, jsonSchema, type ToolSet } from "ai";
import type { NextFunction, Request, Response } from "express";

export const attachMCP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const payload = req.body

  // Get Agent Infos
  const use_agent = req.headers[USE_AGENT_HEADER_KEY] as string
  const model_crn = req.headers[MODEL_CRN_HEADER_KEY] as string
  const prompt = payload.prompt || null

  await mcpClient.connect(transport);
  const { tools } = await mcpClient.listTools();

  if (use_agent === "true") {

    if (!prompt) {
      throw new ApiError(400, getSystemCustomErrorMsgByKey("MISSING_PROMPT_FOR_AGENT")!)
    }

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
      prompt: prompt,
      tools: groqTools,
    });

    const toolResult = toolResults[0]?.output as CallToolResult | undefined;
    console.error("here is the tool result", toolResults, text);

    if (toolResult?.isError) {
      const error = toolResult._meta?.error
      // @ts-ignore
      throw new ApiError(400, { title: "", message: error.message, code: error.code }, "", [SystemCustomErrorMsgByCode[error.code]])
    }


    const status = Number(toolResult?._meta?.status)
    // @ts-ignore
    return res.status(status).json(new ApiResponse(status, toolResult?.content[0]?.text, toolResult?.structuredContent));

  }

  throw new ApiError(400, getSystemCustomErrorMsgByKey("INVALID_AGENT_CALL")!)

}

export const useMCPTool = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const value = req.value
  const tool_name = req.toolName


  await mcpClient.connect(transport);
  const { tools } = await mcpClient.listTools()
  tools.map((tool) => {
    console.log("name: ", tool.name)
  })
  const toolResult = await mcpClient.callTool({
    name: tool_name as string,
    arguments: value as any
  })

  if (toolResult.isError) {
    console.log("tool error", toolResult)
    const error = toolResult._meta?.error as any
    throw new ApiError(Number(error.status) ?? 400, { title: "", message: error?.message, code: error?.code }, "", [SystemCustomErrorMsgByCode[error.code]])
  }

  // @ts-ignore
  const status = Number(toolResult._meta.status) ?? 200
  // @ts-ignore
  return res.status(status).json(new ApiResponse(status, toolResult.content[0].text, toolResult.structuredContent));
}

