import { mcpClient, transport } from "@/libs/mcp-client";
import {
  ApiError,
  ApiResponse,
  convertToValidJson,
  SystemCustomErrorMsgByCode,
} from "@repo/shared";
import type { NextFunction, Request, Response } from "express";

export const useMCPResource = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const uri = req.resourceUri;

  const { contents } = await mcpClient.readResource({ uri: uri as string });

  console.log("here is the content: ", contents);

  const valid_data = convertToValidJson((contents[0] as { text: string }).text);

  req.resourceResult = valid_data;

  return next();
};
