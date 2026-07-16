import type { MCPErrorResponse } from "./mcp-error-response";

export abstract class MCPException extends Error {
  readonly errorCode: string;
  readonly context: Record<string, unknown>;

  constructor(message: string, errorCode: string, cause?: Error) {
    super(message, cause ? { cause } : undefined);
    this.name = new.target.name;
    this.errorCode = errorCode;
    this.context = {};
    Object.setPrototypeOf(this, new.target.prototype);
  }

  addContext(key: string, value: unknown): this {
    this.context[key] = value;
    return this;
  }

  abstract toErrorResponse(): MCPErrorResponse;
}