
import { MCPException } from "@/blueprints";
import { MCPErrorResponse } from "@/helpers";
import { CustomDrizzleErrorMessage } from "@repo/shared";

export class MCPToolException extends MCPException {
    constructor(message: string, toolName: string, errorCode?: string) {
        super(message, errorCode ?? "TOOL_ERROR");
        this.addContext("toolName", toolName);
    }

    toErrorResponse(): MCPErrorResponse {
        return new MCPErrorResponse(this.errorCode, this.message, this.context);
    }
}

export class MCPResourceException extends MCPException {
    constructor(message: string, resourceUri: string, errorCode?: string) {
        super(message, errorCode ?? "RESOURCE_ERROR");
        this.addContext("resourceUri", resourceUri);
    }

    toErrorResponse(): MCPErrorResponse {
        return new MCPErrorResponse(
            this.errorCode,
            `Resource access failed: ${this.message}`,
            this.context
        );
    }
}


// for handling unintentional error
export function handleMCPError(err: unknown): MCPErrorResponse {
  if (err instanceof MCPException) {
    return err.toErrorResponse();
  }

  const code =
    (err as any)?.data?.error?.type ??
    (err as any)?.data?.error?.code ??
    (err as any)?.cause?.code ??
    (err as any)?.code ??
    (err as any)?.statusCode ??
    "UNKNOWN";

  if (CustomDrizzleErrorMessage[code]) {
    const drizzleError = CustomDrizzleErrorMessage[code];
    return new MCPErrorResponse(drizzleError.code ?? code, drizzleError.message, {
      source: "database",
    });
  }

  const message =
    (err as any)?.data?.error?.message ??
    (err as any)?.responseBody ??
    (err as Error)?.message ??
    String(err);

  const details: Record<string, unknown> = {};
  if (err && typeof err === "object") {
    if ("statusCode" in err) details.statusCode = (err as any).statusCode;
    if ("url" in err) details.url = (err as any).url;
    if ("stack" in err) details.stack = (err as any).stack;
    if ("cause" in err) details.cause = (err as any).cause;
  }

  return new MCPErrorResponse(String(code), message, details);
}