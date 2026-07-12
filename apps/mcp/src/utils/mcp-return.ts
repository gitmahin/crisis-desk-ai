import type { ContentBlock, RegisteredTool, ToolCallback } from "@modelcontextprotocol/server"

export const ReturnMCPResponse = (type: ContentBlock["type"], text: string, isError: boolean = false, meta?: Record<string, unknown>) => {
    return {
        isError: isError,
        content: [
            {
                type: type,
                text: text
            }
        ],
        ...(meta ? { _meta: meta } : {})
    }
}