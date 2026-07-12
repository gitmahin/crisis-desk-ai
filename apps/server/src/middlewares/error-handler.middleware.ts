import { BaseConfig } from "@/config";
import {
  ApiError,
  SystemCustomErrorCode,
  SystemCustomErrorMsgByCode,
} from "@repo/shared";
import type { ApiErrorType } from "@repo/types";

import type { NextFunction, Request, Response } from "express";

export const errorHandlerMiddleware = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error: ApiError;

  if (err instanceof ApiError) {
    error = err;
  } else {
    const message = err?.message || "Something went wrong";
    error = new ApiError(
      500,
      {
        ...SystemCustomErrorMsgByCode[
        SystemCustomErrorCode.INTERNAL_SERVER_ERROR
        ]!,
        message,
      },
      err.stack,
      []
    );
  }

  // Store in local for pino logging
  res.locals.errorTitle = error.error.title;
  res.locals.errorMessage = error.error.message;
  res.locals.errorCode = error.error.code;
  res.locals.errors = error.errors

  const status = error.status;
  const success = error.success;
  const response: ApiErrorType = {
    ...error.error,
    status,
    success,
    ...(BaseConfig.NODE_ENV === "development" ? { stack: error.stack } : {}),
    errors: error.errors
  };

  res.status(status).json(response);
};
