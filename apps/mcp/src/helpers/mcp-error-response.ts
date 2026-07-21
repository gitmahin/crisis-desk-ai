/**
 * A standardized Data Transfer Object (DTO) for Model Context Protocol error responses.
 *
 * This class ensures that all errors returned by the server follow a
 * predictable structure, making it easier for clients to implement
 * robust error handling and for developers to trace issues via logs.
 */
export class MCPErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details: Record<string, unknown>;
  readonly timestamp: number;
  readonly status: number;

  /**
   * Creates a standardized error response object.
   *
   * @param code - Machine-readable error string.
   * @param message - Human-readable explanation.
   * @param details - (Optional) Extra context for the error. Defaults to an empty object.
   * @param status - (Optional) Status code (e.g., 400, 404, 500). Defaults to 400.
   */
  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>,
    status?: number
  ) {
    this.code = code;
    this.message = message;
    this.details = details ?? {};
    this.timestamp = Date.now();
    this.status = status ?? 400;
  }

  /**
   * Converts the class instance into a plain JavaScript object.
   * Useful before passing the data to a serialization library or framework-specific response.
   *
   * @returns A plain object representation of the error.
   */
  toObject(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      status: this.status,
    };
  }

  /**
   * Serializes the error response into a JSON string.
   *
   * @remarks
   * Includes a safety fallback to prevent the application from crashing
   * if the `details` object contains non-serializable data (like circular references).
   *
   * @returns A JSON string representation of the error.
   */
  toJSON(): string {
    try {
      return JSON.stringify(this.toObject());
    } catch {
      // Never let the error-reporting logic cause a new error.
      return JSON.stringify({
        code: "SERIALIZATION_ERROR",
        message: "Failed to serialize error response",
      });
    }
  }
}
