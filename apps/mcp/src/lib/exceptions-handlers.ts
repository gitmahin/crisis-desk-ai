import { MCPException } from "@/blueprints";
import { MCPErrorResponse } from "@/helpers";
import { CustomDrizzleErrorMessage } from "@repo/shared";

/**
 * Exception specifically for errors occurring within MCP Tool execution.
 *
 * Extends {@link MCPException} to include the name of the tool,
 * improving traceability in logs and AI feedback loops.
 */
export class MCPToolException extends MCPException {
  /**
   * Creates an instance of MCPToolException.
   *
   * @param message - Human-readable error description.
   * @param toolName - The identifier of the tool that failed.
   * @param errorCode - (Optional) Specific error code. Defaults to 'TOOL_ERROR'.
   * @param status - (Optional) HTTP-style status code.
   */
  constructor(
    message: string,
    toolName: string,
    errorCode?: string,
    status?: number
  ) {
    super(message, errorCode ?? "TOOL_ERROR", status);
    this.addContext("toolName", toolName);
  }

  toErrorResponse(): MCPErrorResponse {
    return new MCPErrorResponse(
      this.errorCode,
      this.message,
      this.context,
      this.status
    );
  }
}

/**
 * Exception specifically for errors occurring during MCP Resource retrieval.
 *
 * Extends {@link MCPException} to include the specific Resource URI
 * that was being accessed.
 */
export class MCPResourceException extends MCPException {
  /**
   * Creates an instance of MCPResourceException.
   *
   * @param message - Human-readable error description.
   * @param resourceUri - The URI of the resource being requested.
   * @param errorCode - (Optional) Specific error code. Defaults to 'RESOURCE_ERROR'.
   * @param status - (Optional) HTTP-style status code.
   */
  constructor(
    message: string,
    resourceUri: string,
    errorCode?: string,
    status?: number
  ) {
    super(message, errorCode ?? "RESOURCE_ERROR", status);
    this.addContext("resourceUri", resourceUri);
  }

  /**
   * Maps the resource exception to a standardized error response
   * with an prefixed message for context.
   */
  toErrorResponse(): MCPErrorResponse {
    return new MCPErrorResponse(
      this.errorCode,
      `Resource access failed: ${this.message}`,
      this.context,
      this.status
    );
  }
}

/**
 * A "Swiss Army Knife" error handler that normalizes unknown exceptions into
 * standardized {@link MCPErrorResponse} objects.
 *
 * This function handles:
 * 1. Custom {@link MCPException} instances.
 * 2. Database errors (specifically mapped from Drizzle).
 * 3. Native JS Errors and third-party response errors.
 *
 * @param err - The caught error object of unknown type.
 * @returns A formatted MCPErrorResponse ready for the protocol wire.
 */
export function handleMCPError(err: unknown): MCPErrorResponse {
  // 1. If it's already one of our custom exceptions, just use its internal logic
  if (err instanceof MCPException) {
    return err.toErrorResponse();
  }

  /**
   * 2. Error Code Extraction
   * Attempts to find an error code across various common library patterns
   * (AWS, Axios, Drizzle, Node.js system errors).
   */
  const code =
    (err as any)?.data?.error?.type ??
    (err as any)?.data?.error?.code ??
    (err as any)?.cause?.code ??
    (err as any)?.code ??
    (err as any)?.statusCode ??
    "UNKNOWN";

  // 3. Database Special Handling (Drizzle)
  // Maps cryptic SQL codes into user-friendly messages from shared repo
  if (CustomDrizzleErrorMessage[code]) {
    const drizzleError = CustomDrizzleErrorMessage[code];
    return new MCPErrorResponse(
      drizzleError.code ?? code,
      drizzleError.message,
      {
        source: "database",
      }
    );
  }

  /**
   * 4. Message Extraction
   * Gracefully pulls the most descriptive message available.
   */
  const message =
    (err as any)?.data?.error?.message ??
    (err as any)?.responseBody ??
    (err as Error)?.message ??
    String(err);

  /**
   * 5. Metadata Enrichment
   * Captures technical details for debugging without crashing the reporter.
   */
  const details: Record<string, unknown> = {};
  if (err && typeof err === "object") {
    if ("statusCode" in err) details.statusCode = (err as any).statusCode;
    if ("url" in err) details.url = (err as any).url;
    if ("stack" in err) details.stack = (err as any).stack;
    if ("cause" in err) details.cause = (err as any).cause;
  }

  return new MCPErrorResponse(String(code), message, details);
}
