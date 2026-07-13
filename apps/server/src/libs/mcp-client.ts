import { BaseConfig } from "@/config";
import { Client } from "@modelcontextprotocol/sdk/client";
// keep it .js otherwise serverless will throw error
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const mcpClient = new Client(
  {
    name: "crisis-desk-ai-client",
    version: "1.0.0",
  },
  {
    capabilities: {
      sampling: {},
    },
  }
);

export const transport = new StreamableHTTPClientTransport(
  new URL(BaseConfig.MCP_BASE_URL)
);
