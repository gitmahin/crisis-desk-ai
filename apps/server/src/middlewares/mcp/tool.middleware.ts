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

/**
 * Middleware that attaches an AI Agent to the request flow.
 *
 * This is a "Dynamic Orchestrator":
 * 1. It lists all available tools from the MCP Server.
 * 2. It wraps these tools into an 'AI SDK' compatible format.
 * 3. It provides the LLM with the context of any previously fetched MCP Resource.
 * 4. The LLM then decides which tools to call to satisfy the user's prompt.
 */
export const attachAgent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const payload = req.body;

  // Get Agent Infos
  const use_agent = req.headers[USE_AGENT_HEADER_KEY] as string; // value = true
  const model_crn = req.headers[MODEL_CRN_HEADER_KEY] as string; // value = model_name

  // console.log("here is mahin agent: ", use_agent);

  // Combine Resource Data (Context) with the User's Prompt
  const prompt = `Task: ${payload.prompt}`;

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
      system: `You are a report management assistant with access to multiple tools.
                IMPORTANT: Only call create-new-report when the user is actually describing a NEW incident they want to report (e.g. "someone is injured", "there's a fire", "report this emergency"). The presence of words like "create" or "created" in the user's message does NOT mean you should create a report — e.g. "delete the report that was created last" is a deletion request, not a creation request.

                Read the user's actual intent, not just keyword matches. If the task is about finding, deleting, updating, or listing existing reports, use the appropriate tool for that instead.
                
                Existing reports:
                ${JSON.stringify(req.resourceResult)}
                `,
      prompt: prompt,
      tools: groqTools,
    });

    const toolResult = toolResults[0]?.output as CallToolResult | undefined;
    // console.error("here is the tool result", toolResults, text);

    if (toolResult?.isError) {
      const error = toolResult._meta?.error;

      throw new ApiError(
        400,
        // @ts-ignore
        { title: "", message: error.message, code: error.code },
        "",
        // @ts-ignore
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

/**
 * Middleware that executes an MCP Tool based on injected payload parameters.
 *
 * @remarks
 * Handles MCP-level errors by mapping them to standard {@link ApiError} instances.
 * Success results are returned directly to the client as a JSON response.
 */
export const useMCPTool = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const value = req.value;
  const tool_name = req.toolName;

  const toolResult = await mcpClient.callTool({
    name: tool_name as string,
    arguments: value as any,
  });

  if (toolResult.isError) {
    // console.log("tool error", toolResult);
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

  return res.status(status).json(
    new ApiResponse(
      status,
      // @ts-ignore
      toolResult.content[0].text,
      toolResult.structuredContent
    )
  );
};
