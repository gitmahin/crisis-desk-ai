import { pinoLogger } from "@repo/logger";
import type { NextFunction, Request, Response } from "express";

export const requestLogger = () => {
  const logger = pinoLogger.createLogger();

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime();

    res.on("finish", () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);

      const logData = {
        method: req.method,

        url: req.url,
        path: req.path,

        query: req.query,
        params: req.params,

        ip: req.ip || req.get("x-forwarded-for"),
        userAgent: req.get("user-agent"),
        referer: req.get("referer"),
        host: req.get("host"),

        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        errorMessage:
          res.statusCode >= 400
            ? {
                title: res.locals.errorTitle,
                message: res.locals.errorMessage,
                code: res.locals.errorCode,
                errors: res.locals.errors,
              }
            : undefined,
      };

      if (res.statusCode >= 400) {
        logger.error(logData, "Request failed");
      } else {
        logger.info(logData, "Request completed");
      }
    });

    next();
  };
};
