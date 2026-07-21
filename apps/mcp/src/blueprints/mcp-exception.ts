import type { MCPErrorResponse } from "@/helpers";

/**
 * Base abstract class for all Model Context Protocol (MCP) exceptions.
 *
 * This class extends the native `Error` to provide a consistent structure
 * for error handling, including error codes, HTTP status mapping, and
 * metadata context for debugging.
 *
 * @abstract
 */
export abstract class MCPException extends Error {
  readonly errorCode: string;
  readonly context: Record<string, unknown>;
  readonly status: number;

  /**
   * Creates an instance of MCPException.
   *
   * @param message - A human-readable description of the error.
   * @param errorCode - A string code identifying the error type.
   * @param status - (Optional) The HTTP status code. Defaults to 400.
   * @param cause - (Optional) The original error that triggered this exception (Error Chaining).
   */
  constructor(
    message: string,
    errorCode: string,
    status?: number,
    cause?: Error
  ) {
    super(message, cause ? { cause } : undefined);
    this.name = new.target.name;
    this.errorCode = errorCode;
    this.context = {};
    this.status = status ?? 400;
    /**
     * Set the prototype explicitly to ensure 'instanceof' works correctly
     * across different environments when extending native Error.
     */
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Adds metadata to the error context for better log traceability.
   *
   * @param key - The key for the context entry.
   * @param value - The value associated with the key.
   * @returns The current instance (Fluent API/Builder pattern).
   *
   * @example
   * throw new DatabaseException("Query failed", "DB_ERROR")
   *   .addContext("userId", user.id);
   */
  addContext(key: string, value: unknown): this {
    this.context[key] = value;
    return this;
  }

  /**
   * Transforms the exception into a standardized error response object.
   * This ensures that API consumers receive a consistent error format.
   *
   * @abstract
   * @returns {MCPErrorResponse} The formatted error response.
   */
  abstract toErrorResponse(): MCPErrorResponse;
}
