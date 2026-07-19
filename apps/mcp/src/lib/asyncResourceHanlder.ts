import type { ReadResourceCallback, ReadResourceTemplateCallback } from "@modelcontextprotocol/server";

import { MCPException } from "@/blueprints";
import { handleMCPError } from "./exceptions-handlers";

type AnyResourceCallback = ReadResourceCallback | ReadResourceTemplateCallback;

export function asyncResourceHandler<T extends AnyResourceCallback>(
  requestHandlerFn: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      // @ts-expect-error - spreading generic args into the original fn
      return await requestHandlerFn(...args);
    } catch (error) {
      console.log("Error here:", error);
      const errorResponse =
        error instanceof MCPException
          ? error.toErrorResponse()
          : handleMCPError(error);

      return {
        contents: [
          {
            uri: (args[0] as any)?.toString?.() ?? "",
            text: errorResponse.message,
            mimeType: "application/json",
          },
        ],
        // It will not show in sdk call.
        _meta: {
          error: errorResponse.toObject(),
        },
        isError: true,
      };
    }
  }) as T;
}