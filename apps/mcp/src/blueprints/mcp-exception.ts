import type { MCPErrorResponse } from "@/helpers";

export abstract class MCPException extends Error {
  readonly errorCode: string;
  readonly context: Record<string, unknown>;
  readonly status: number;

  constructor(message: string, errorCode: string, status?: number, cause?: Error ) {
    super(message, cause ? { cause } : undefined);
    this.name = new.target.name;
    this.errorCode = errorCode;
    this.context = {};
    this.status = status ?? 400
    Object.setPrototypeOf(this, new.target.prototype);
  }

  addContext(key: string, value: unknown): this {
    this.context[key] = value;
    return this;
  }

  abstract toErrorResponse(): MCPErrorResponse;
}