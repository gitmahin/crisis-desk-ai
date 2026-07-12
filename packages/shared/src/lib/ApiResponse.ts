import { type ApiResponseType } from "@repo/types";

export class ApiResponse implements ApiResponseType {
  constructor(
    public status: number,
    public message: string,
    public data: unknown = null,
    public success: boolean = status < 400,
    public title: string = ""
  ) {
    this.status = status;
    this.title = title;
    this.message = message;
    this.data = data;
    this.success = success;
  }
}
