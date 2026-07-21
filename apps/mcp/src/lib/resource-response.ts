/**
 * A standardized Data Transfer Object (DTO) for successful Model Context Protocol
 * resource responses.
 *
 * This class encapsulates the content of a resource (such as a file, a database record,
 * or an AI-generated summary) into a format compliant with the MCP specification.
 *
 * @template T - The type of the text content, constrained to a string.
 *               Defaults to a generic string.
 */
export class MCPResourceResponse<T extends string = string> {
  readonly contents: { uri: string; text: T; mimeType: string }[];
  readonly resultType: "success";

  /**
   * Creates an instance of MCPResourceResponse.
   *
   * @param uri - The URI of the resource.
   * @param text - The content of the resource (must be a string).
   * @param mimeType - (Optional) The IANA media type. Defaults to 'application/json'.
   */
  constructor(uri: string, text: T, mimeType: string = "application/json") {
    this.contents = [{ uri, text, mimeType }];
    this.resultType = "success";
  }

  /**
   * Converts the class instance into a plain JavaScript object.
   *
   * @remarks
   * This is the final format expected by the MCP SDK when resolving
   * a resource request.
   *
   * @returns A plain object representation of the resource response.
   */
  toObject() {
    return {
      contents: this.contents,
      resultType: this.resultType,
    };
  }
}
