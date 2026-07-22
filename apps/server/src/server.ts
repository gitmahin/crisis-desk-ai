// ┌─────────────────────────┐
// │ Base Imports            │
// └─────────────────────────┘
import express from "express";
import type { Express, Request } from "express";
import cors from "cors";
import serverless from "serverless-http";
import cookieParser from "cookie-parser";
import routers from "./routes/index.route";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import requestIp from "request-ip";

// ┌─────────────────────────┐
// │ Event Handler Imports   │
// └─────────────────────────┘
import { ApiResponse } from "@repo/shared";

// ┌─────────────────────────┐
// │ Middleware imports      │
// └─────────────────────────┘
import { errorHandlerMiddleware, requestLogger } from "./middlewares";
import { connectRedis, redisClient } from "./libs/redis";

const app: Express = express();

/* -------------------------------------------------------------------------- */
/*                                Base Setup                                  */
/* -------------------------------------------------------------------------- */
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true, limit: "500kb" }));
app.use(cookieParser());
app.use(requestIp.mw());

// dont run logger in production for aws lambda
if (process.env.NODE_ENV === "development") {
  app.use(requestLogger());
}

/* -------------------------------------------------------------------------- */
/*                                 Rate Limiter                               */
/* -------------------------------------------------------------------------- */
await connectRedis();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 6 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
  passOnStoreError: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
});

app.use(limiter);
/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */
app.use("/api", routers);

app.get("/health", async (req, res) => {
  // throw new ApiError(500, getSystemCustomErrorMsgByKey("INTERNAL_SERVER_ERROR")!)
  // console.log("ip is", req.clientIp);
  // const result = await redisClient.ping();
  // console.log(result);
  res.status(200).json(new ApiResponse(200, "OK"));
});

/* -------------------------------------------------------------------------- */
/*                          Error Handler Middleware                          */
/* -------------------------------------------------------------------------- */
app.use(errorHandlerMiddleware);

export const handler = serverless(app, {
  request: (request: Request, event: Event) => {
    if (Buffer.isBuffer(request.body)) {
      try {
        request.body = JSON.parse(request.body.toString("utf8"));
      } catch (err) {
        request.body = request.body.toString("utf8");
      }
    }
  },
});
