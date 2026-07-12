import type { NextFunction, RequestHandler, Request, Response } from "express";

export const asyncHandler = (requestHandlerFn: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestHandlerFn(req, res, next)).catch((err) => next(err));
  };
};