import { type ApiErrorType } from "@repo/types";
import {
  SystemCustomErrorMsgByCode,
  type SystemCustomErrorMessageDataType,
} from "@/events";

export class ApiError extends Error implements ApiErrorType {
  public success?: boolean;
  public status: number;
  public errors: unknown[];
  constructor(
    status: number,
    public error:
      | (typeof SystemCustomErrorMsgByCode)[keyof typeof SystemCustomErrorMsgByCode]
      | SystemCustomErrorMessageDataType,
    override stack?: string,
    errors?: unknown[]
  ) {
    super(error.message);
    this.status = status;
    this.success = false;
    this.errors = errors ?? [];

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
