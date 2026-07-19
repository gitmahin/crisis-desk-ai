import type { ServerContext, ToolCallback } from "@modelcontextprotocol/server";
import { handleMCPError } from "./exceptions-handlers";
import { MCPException } from "@/blueprints";

// IMPORTANT: return errors in _meta
// return success message in text as JSON or string.
// Consumer will handler parsing the JSON
export const asyncToolHandler = <TArgs, TReturn>(
    requestHandlerFn: (payload: TArgs, ctx: ServerContext) => TReturn | Promise<TReturn>
) => {
    return async (payload: TArgs, ctx: ServerContext): Promise<TReturn | ReturnType<typeof errorFallback>> => {
        return await Promise.resolve(requestHandlerFn(payload, ctx)).catch(errorFallback);
    };
};

function errorFallback(error: unknown) {
    const errorResponse =
        error instanceof MCPException ? error.toErrorResponse() : handleMCPError(error);
    console.log("inside the tool error", error)
    return {
        content: [{ type: "text" as const, text: errorResponse.message ?? "No message" }],
        _meta: {
            error: errorResponse.toObject(),
        },
        isError: true,
    };
}