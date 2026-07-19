export class MCPToolResponse<T = Record<string, unknown>> {
  readonly content: { type: "text"; text: string }[];
  readonly structuredContent: T;
  readonly isError: boolean;
  readonly resultType: "success";
  readonly status: number;

  constructor(message: string, structuredContent: T, status: number) {
    this.content = [{ type: "text", text: message }];
    this.structuredContent = structuredContent;
    this.isError = false;
    this.resultType = "success";
    this.status = status;
  }

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
