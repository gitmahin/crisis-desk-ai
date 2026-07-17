export class MCPErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details: Record<string, unknown>;
  readonly timestamp: number;
  readonly status: number

  constructor(code: string, message: string, details?: Record<string, unknown>, status?: number) {
    this.code = code;
    this.message = message;
    this.details = details ?? {};
    this.timestamp = Date.now();
    this.status = status ?? 400

  }

  toObject(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      status: this.status
    };
  }

  toJSON(): string {
    try {
      return JSON.stringify(this.toObject());
    } catch {
      return JSON.stringify({
        code: "SERIALIZATION_ERROR",
        message: "Failed to serialize error response",
      });
    }
  }
}