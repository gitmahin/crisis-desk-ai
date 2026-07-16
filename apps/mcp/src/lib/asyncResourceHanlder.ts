import type { ReadResourceCallback, ReadResourceTemplateCallback } from "@modelcontextprotocol/server";

import { MCPException } from "@/blueprints";
import { handleMCPError } from "./exceptions-handlers";

export const asyncResourceHandler = (
  requestHandlerFn: ReadResourceTemplateCallback
): ReadResourceTemplateCallback => {
  return ((...args: any[]) => {
    return Promise.resolve((requestHandlerFn as any)(...args)).catch((error) => {

      console.log("Error here:", error)
      const errorResponse =
        error instanceof MCPException
          ? error.toErrorResponse()
          : handleMCPError(error);

      return {
        contents: [
          {
            uri: args[0]?.toString?.() ?? "",
            text: errorResponse.message,
            mimeType: "application/json",
          },
        ],
        isError: true,
      };
    });
  }) as ReadResourceTemplateCallback;
};