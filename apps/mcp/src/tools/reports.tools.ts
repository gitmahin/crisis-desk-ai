import type { McpServer } from "@modelcontextprotocol/server";
import { reportZSchema } from "@repo/zod"
import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { REPORT_PREDICTION_PROMPT } from "@/constant-prompts";
import { ReturnMCPResponse } from "@/utils/mcp-return";

export const registerCreateNewReport = (server: McpServer) => {
    server.registerTool("create-new-report", {
        title: "Create new report",
        description: "Create new report based on the given value.",
        inputSchema: reportZSchema.createReport,
        annotations: {
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
            readOnlyHint: false
        }

    }, async (payload) => {
        const { } = payload
        // Sampling is deprecated. So we have to call LLM directly
        const { text } = await generateText({
            model: google("gemini-2.0-flash"),
            prompt: REPORT_PREDICTION_PROMPT,
        })

        if (!text) {
            return ReturnMCPResponse("text", "AI classification failed. Please try again!")
        }

        try {
            const predicted_data = JSON.parse(text.trim().replace(/^```json/, "").replace(/```$/, "").trim())

        } catch (error) {

        }


    })
}