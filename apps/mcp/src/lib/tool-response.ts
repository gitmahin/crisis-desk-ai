export class MCPToolResponse<T = Record<string, unknown>> {
  readonly content: { type: "text"; text: string }[];
  readonly structuredContent: T;
  readonly isError: boolean;
  readonly resultType: "success";

  constructor(message: string, structuredContent: T) {
    this.content = [{ type: "text", text: message }];
    this.structuredContent = structuredContent;
    this.isError = false;
    this.resultType = "success";
  }

  toObject() {
    return {
      content: this.content,
      structuredContent: this.structuredContent,
      isError: this.isError,
      resultType: this.resultType,
    };
  }
}