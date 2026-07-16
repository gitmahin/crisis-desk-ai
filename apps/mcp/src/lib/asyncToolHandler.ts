import type { ServerContext, ToolCallback } from "@modelcontextprotocol/server";
import { handleMCPError, MCPException } from "./exception-handlers";

export const asyncToolHandler = <TArgs, TReturn>(
    requestHandlerFn: (payload: TArgs, ctx: ServerContext) => TReturn | Promise<TReturn>
) => {
    return (payload: TArgs, ctx: ServerContext): Promise<TReturn | ReturnType<typeof errorFallback>> => {
        return Promise.resolve(requestHandlerFn(payload, ctx)).catch(errorFallback);
    };
};

function errorFallback(error: unknown) {
    const errorResponse =
        error instanceof MCPException ? error.toErrorResponse() : handleMCPError(error);
    return {
        content: [{ type: "text" as const, text: errorResponse.message }],
        structuredContent: errorResponse.toObject(),
        isError: true,
    };
}