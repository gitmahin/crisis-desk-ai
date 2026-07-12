import { type ApiErrorType } from "@repo/types";
import { SystemCustomErrorMsgByCode } from "@/events";

export class ApiError extends Error implements ApiErrorType {
  public success?: boolean;
  public status: number;
  constructor(
    status: number,
    public error: (typeof SystemCustomErrorMsgByCode)[keyof typeof SystemCustomErrorMsgByCode],
    override stack?: string
  ) {
    super(error.message);
    this.status = status;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
