// ┌─────────────────────────┐
// │ Base Imports            │
// └─────────────────────────┘
import express from "express";
import type { Express, Request } from "express";
import cors from "cors";
import serverless from "serverless-http";
import cookieParser from "cookie-parser";
import routers from "./routes/index.route"


// ┌─────────────────────────┐
// │ Event Handler Imports   │
// └─────────────────────────┘
import { ApiResponse } from "@repo/shared";

// ┌─────────────────────────┐
// │ Middleware imports      │
// └─────────────────────────┘
import { errorHandlerMiddleware, requestLogger } from "./middlewares";
// import { postgres } from "./libs";


// ┌─────────────────────────┐
// │ Router Imports          │
// └─────────────────────────┘
// import router from "@/routes/index.route"

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
app.use(requestLogger());

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */
app.use("/api", routers);

app.get("/health", (req, res) => {
  // throw new ApiError(500, getSystemCustomErrorMsgByKey("INTERNAL_SERVER_ERROR")!)
  res.status(200).json(new ApiResponse(200, "OK"))
})


/* -------------------------------------------------------------------------- */
/*                          Error Handler Middleware                          */
/* -------------------------------------------------------------------------- */
app.use(errorHandlerMiddleware);

export const handler = serverless(app, {
  request: (request: Request, event: Event) => {
    if (Buffer.isBuffer(request.body)) {
      try {
        request.body = JSON.parse(request.body.toString('utf8'));
      } catch (err) {
        request.body = request.body.toString('utf8');
      }
    }
  }
});
