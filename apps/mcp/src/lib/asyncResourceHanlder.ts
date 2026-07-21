import type {
  ReadResourceCallback,
  ReadResourceTemplateCallback,
} from "@modelcontextprotocol/server";

import { MCPException } from "@/blueprints";
import { handleMCPError } from "./exceptions-handlers";

type AnyResourceCallback = ReadResourceCallback | ReadResourceTemplateCallback;

/**
 * A Higher-Order Function (HOF) that wraps MCP resource handlers with global error handling.
 * 
 * This wrapper catches both synchronous and asynchronous exceptions, transforming them 
 * into standardized MCP error responses. It ensures the server remains stable and 
 * provides the AI agent with a protocol-compliant error message.
 * 
 * @template T - The specific type of the resource callback being wrapped.
 * @param requestHandlerFn - The actual business logic function for the resource.
 * @returns A "protected" version of the handler that manages its own lifecycle and errors.
 * 
 * @example
 * this.server.registerResource(
 *   "my-resource",
 *   new ResourceTemplate("..."),
 *   asyncResourceHandler(async (uri, vars) => {
 *      // Your logic here - no manual try/catch needed!
 *   })
 * );
 */
export function asyncResourceHandler<T extends AnyResourceCallback>(
  requestHandlerFn: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      // @ts-expect-error - spreading generic args into the original fn
      return await requestHandlerFn(...args);
    } catch (error) {
      // console.error("Error here:", error);
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
