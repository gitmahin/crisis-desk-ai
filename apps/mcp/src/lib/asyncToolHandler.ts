import type { ServerContext, ToolCallback } from "@modelcontextprotocol/server";
import { handleMCPError } from "./exceptions-handlers";
import { MCPException } from "@/blueprints";

/**
 * A Higher-Order Function (HOF) that wraps MCP Tool handlers with automatic error management.
 * 
 * This wrapper ensures that any exception thrown during tool execution is caught and 
 * formatted into a protocol-compliant error response. It prevents the server from 
 * crashing and provides the LLM with clear feedback when an action fails.
 * 
 * @template TArgs - The expected shape of the input arguments for the tool.
 * @template TReturn - The expected successful return type of the tool.
 * 
 * @param requestHandlerFn - The actual function containing the tool's business logic.
 * @returns A "safe" tool handler that automatically manages promise resolution and rejections.
 * 
 * @example
 * this.server.registerTool(
 *   "create-report",
 *   "Creates a new incident report",
 *   CreateReportSchema,
 *   asyncToolHandler(async (args, ctx) => {
 *     return await db.reports.create(args);
 *   })
 * );
 */
export const asyncToolHandler = <TArgs, TReturn>(
  requestHandlerFn: (
    payload: TArgs,
    ctx: ServerContext
  ) => TReturn | Promise<TReturn>
) => {
  return async (
    payload: TArgs,
    ctx: ServerContext
  ): Promise<TReturn | ReturnType<typeof errorFallback>> => {
       /**
     * Promise.resolve handles both synchronous and asynchronous inputs.
     * If the function throws or the promise rejects, it flows into errorFallback.
     */
    return await Promise.resolve(requestHandlerFn(payload, ctx)).catch(
      errorFallback
    );
  };
};

/**
 * Centralized error transformation for MCP Tools.
 * 
 * Maps internal exceptions to the standardized protocol format for tool outputs.
 * 
 * @internal
 * @param error - The caught exception (could be an MCPException, Error, or unknown).
 * @returns An object conforming to the MCP Tool output schema with 'isError: true'.
 */
function errorFallback(error: unknown) {
  const errorResponse =
    error instanceof MCPException
      ? error.toErrorResponse()
      : handleMCPError(error);
   /**
   * Note for AI Consumers:
   * By returning the error message in the 'content' block, the LLM is informed
   * of why the tool failed (e.g., 'Validation error: invalid zip code'), 
   * allowing it to potentially correct the mistake and try again.
   */
  return {
    content: [
      { type: "text" as const, text: errorResponse.message ?? "No message" },
    ],
    /**
     * Diagnostic metadata provided in the _meta field. 
     * This is recorded by the host application.
     */
    _meta: {
      error: errorResponse.toObject(),
    },
    isError: true,
  };
}
