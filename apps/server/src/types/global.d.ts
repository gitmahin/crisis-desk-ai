import type { mcpClient } from "@/libs/mcp-client";

export {}; // make this file a module

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string };
      value?: unknown;
      toolName?: string;
      toolResult?: Awaited<ReturnType<typeof mcpClient.callTool>>;
      resourceUri?: string;
      resourceResult?: Awaited<ReturnType<typeof mcpClient.readResource>>;
    }
  }
}
