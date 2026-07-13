import type { McpServer } from "@modelcontextprotocol/server";

interface IMcpInstance {
  init(): void;
}

export abstract class McpRegistrar implements IMcpInstance {
  protected server: McpServer;

  constructor(server: McpServer) {
    this.server = server;
  }

  abstract init(): void;
}
