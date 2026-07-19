export class MCPResourceResponse<T extends string = string> {
  readonly contents: { uri: string; text: T; mimeType: string }[];
  readonly resultType: "success";

  constructor(uri: string, text: T, mimeType: string = "application/json") {
    this.contents = [{ uri, text, mimeType }];
    this.resultType = "success";
  }

  toObject() {
    return {
      contents: this.contents,
      resultType: this.resultType,
    };
  }
}