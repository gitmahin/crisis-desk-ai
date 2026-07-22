import { mcpClient, transport } from "@/libs/mcp-client";
import {
  ApiError,
  ApiResponse,
  convertToValidJson,
  SystemCustomErrorMsgByCode,
} from "@repo/shared";
import type { NextFunction, Request, Response } from "express";

/**
 * Middleware that reads an MCP Resource and attaches the result to the Request object.
 *
 * @remarks
 * This allows downstream controllers to access MCP data via `req.resourceResult`.
 * It automatically handles JSON parsing of the resource text content.
 */
export const useMCPResource = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const uri = req.resourceUri; // Populated by payload injector middleware

  const { contents } = await mcpClient.readResource({ uri: uri as string });

  // console.log("here is the content: ", contents);

  // if (contents.length < 1) {
  //   return res.status(200).json(new ApiResponse(200, "Empty resource."));
  // }

  const valid_data = convertToValidJson((contents[0] as { text: string }).text);

  req.resourceResult = valid_data;

  return next();
};
