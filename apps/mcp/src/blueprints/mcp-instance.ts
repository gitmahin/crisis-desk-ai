import type { McpServer } from "@modelcontextprotocol/server";

interface IMcpInstance {
  init(): void;
}

/**
 * Base class for organizing MCP logic into domain-specific modules.
 * 
 * Subclasses should implement the {@link init} method to define how 
 * resources, tools, or prompts are registered.
 * 
 * @abstract
 */
export abstract class McpRegistrar implements IMcpInstance {
  protected server: McpServer;

  /**
 * Creates an instance of the registrar.
 * @param server - The target MCP server where components will be registered.
 */
  constructor(server: McpServer) {
    this.server = server;
  }

  /**
 * Entry point for registration logic.
 * Must be implemented by the specific domain class.
 * @abstract
 */
  abstract init(): void;
}
