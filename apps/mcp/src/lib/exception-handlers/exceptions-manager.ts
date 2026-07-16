import { MCPException } from "./mcp-exception";
import { MCPErrorResponse } from "./mcp-error-response";
import { CustomDrizzleErrorMessage } from "@repo/shared";

export class MCPToolException extends MCPException {
    constructor(message: string, toolName: string) {
        super(message, "TOOL_ERROR");
        this.addContext("toolName", toolName);
    }

    toErrorResponse(): MCPErrorResponse {
        return new MCPErrorResponse(this.errorCode, this.message, this.context);
    }
}

export class MCPResourceException extends MCPException {
    constructor(message: string, resourceUri: string) {
        super(message, "RESOURCE_ERROR");
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

    const code = (err as any)?.cause?.code ?? (err as any)?.code;

    if (code && CustomDrizzleErrorMessage[code]) {
        const drizzleError = CustomDrizzleErrorMessage[code];
        return new MCPErrorResponse(
            drizzleError.code ?? code,
            drizzleError.message,
            { source: "database" }
        );
    }

    if (err instanceof Error) {
        return new MCPErrorResponse("INTERNAL_ERROR", err.message, { stack: err.stack });
    }

    return new MCPErrorResponse("UNKNOWN_ERROR", String(err));
}