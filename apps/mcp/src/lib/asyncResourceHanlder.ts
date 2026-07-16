import type { ReadResourceCallback } from "@modelcontextprotocol/server";
import { handleMCPError, MCPException } from "./exception-handlers";

export const asyncResourceHandler = (
  requestHandlerFn: ReadResourceCallback
): ReadResourceCallback => {
  return ((...args: any[]) => {
    return Promise.resolve((requestHandlerFn as any)(...args)).catch((error) => {
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
  }) as ReadResourceCallback;
};