import { groq } from "@/libs/ai-models";
import { mcpClient, transport } from "@/libs/mcp-client";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import { MODEL_CRN_HEADER_KEY, USE_AGENT_HEADER_KEY } from "@repo/constants";
import {
  ApiError,
  ApiResponse,
  getSystemCustomErrorMsgByKey,
  SystemCustomErrorMsgByCode,
} from "@repo/shared";
import { generateText, jsonSchema, type ToolSet } from "ai";
import type { NextFunction, Request, Response } from "express";

export const attachAgent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const payload = req.body;

  // Get Agent Infos
  const use_agent = req.headers[USE_AGENT_HEADER_KEY] as string; // value = true
  const model_crn = req.headers[MODEL_CRN_HEADER_KEY] as string; // value = model_name

  console.log("here is mahin agent: ", use_agent);
  const prompt =
    `Here is the necessary resource: ${JSON.stringify(req.resourceResult)}.
  Now do the task given in the prompt.
  ` + payload.prompt || null;

  const { tools } = await mcpClient.listTools();

  if (use_agent === "true") {
    if (!prompt) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("MISSING_PROMPT_FOR_AGENT")!
      );
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
      const error = toolResult._meta?.error;
      // @ts-ignore
      throw new ApiError(
        400,
        { title: "", message: error.message, code: error.code },
        "",
        [SystemCustomErrorMsgByCode[error.code]]
      );
    }

    // @ts-ignore
    const status = Number(toolResult?._meta?.error?.status) || 200;
    // @ts-ignore

    const tool_name = toolResults[0]?.toolName as string;
    // @ts-ignore
    const message = toolResults.length < 1 ? text : toolResult?.content[0].text;
    return res.status(status).json(
      new ApiResponse(status, message, {
        toolName: tool_name,
        content: toolResult?.structuredContent,
      })
    );
  }
  throw new ApiError(400, getSystemCustomErrorMsgByKey("INVALID_AGENT_CALL")!);
};

export const useMCPTool = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const value = req.value;
  const tool_name = req.toolName;

  const { tools } = await mcpClient.listTools();
  tools.map((tool) => {
    console.log("name: ", tool.name);
  });
  const toolResult = await mcpClient.callTool({
    name: tool_name as string,
    arguments: value as any,
  });

  if (toolResult.isError) {
    console.log("tool error", toolResult);
    const error = toolResult._meta?.error as any;
    throw new ApiError(
      Number(error.status) ?? 400,
      { title: "", message: error?.message, code: error?.code },
      "",
      [SystemCustomErrorMsgByCode[error.code]]
    );
  }

  // @ts-ignore
  const status = Number(toolResult._meta.status) ?? 200;
  // @ts-ignore
  return res
    .status(status)
    .json(
      new ApiResponse(
        status,
        toolResult.content[0].text,
        toolResult.structuredContent
      )
    );
};
