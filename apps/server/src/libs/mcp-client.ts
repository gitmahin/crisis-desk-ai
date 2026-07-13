import { Client } from "@modelcontextprotocol/sdk/client"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";

export const mcpClient = new Client({
    name: "crisis-desk-ai-client",
    version: "1.0.0"
}, {
    capabilities: {
        sampling: {},
    }
})

export const transport = new StreamableHTTPClientTransport(new URL("http://localhost:5001/"))