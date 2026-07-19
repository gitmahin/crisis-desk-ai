import { BaseConfig } from "@/config";
import { Client } from "@modelcontextprotocol/sdk/client";
// keep it .js otherwise serverless will throw error
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const transport = new StreamableHTTPClientTransport(
  new URL(BaseConfig.MCP_BASE_URL)
);

let mcpClientCon: Client;

async function getMcpClient(): Promise<Client> {
  if (mcpClientCon) return mcpClientCon;

  mcpClientCon = new Client(
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
  await mcpClientCon.connect(transport);
  return mcpClientCon;
}
// in your request handler
export const mcpClient = await getMcpClient(); // reuses existing connection, no re-connect
