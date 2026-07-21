/**
 * A standardized Data Transfer Object (DTO) for successful Model Context Protocol 
 * tool executions.
 * 
 * Unlike resources, tools often return both a narrative description of the 
 * action taken (for the LLM) and structured data (for the host application).
 * 
 * @template T - The type of the structured data payload. 
 *               Defaults to a standard key-value record.
 */
export class MCPToolResponse<T = Record<string, unknown>> {
  readonly content: { type: "text"; text: string }[];
  readonly structuredContent: T;
  readonly isError: boolean;
  readonly resultType: "success";
  readonly status: number;

  /**
 * Creates an instance of MCPToolResponse.
 * 
 * @param message - A human-readable summary of the action (e.g., "Report #123 created").
 * @param structuredContent - The actual data object returned by the operation.
 * @param status - The status code representing the outcome.
 */
  constructor(message: string, structuredContent: T, status: number) {
    this.content = [{ type: "text", text: message }];
    this.structuredContent = structuredContent;
    this.isError = false;
    this.resultType = "success";
    this.status = status;
  }

  /**
 * Converts the instance into a format compliant with the MCP Tool result schema.
 * 
 * @remarks
 * Maps the internal `status` to the `_meta` field. This ensures that technical 
 * metadata is available to the client without cluttering the primary 
 * response content seen by the AI.
 * 
 * @returns A plain object ready for the MCP transport layer.
 */
  toObject() {
    return {
      content: this.content,
      structuredContent: this.structuredContent,
      isError: this.isError,
      resultType: this.resultType,
      _meta: {
        status: this.status,
      },
    };
  }
}
