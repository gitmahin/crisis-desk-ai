import type { CallToolResult, ContentBlock, RegisteredTool, ToolCallback } from "@modelcontextprotocol/server"

export const ReturnMCPResponse = (
    text: string,
    structuredContent?: Record<string, unknown>,
    isError: boolean = false,
    meta?: Record<string, unknown>
): CallToolResult => {
    return {
        isError: isError,
        content: [
            {
                type: "text",
                text: text
            }
        ],
        ...(structuredContent ? { structuredContent } : {}),
        ...(meta ? { _meta: meta } : {})
    }
}