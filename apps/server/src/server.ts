// ┌─────────────────────────┐
// │ Base Imports            │
// └─────────────────────────┘
import express, { type Express } from "express";
import cors from "cors";
import serverless from "serverless-http";
import cookieParser from "cookie-parser";

// ┌─────────────────────────┐
// │ Event Handler Imports   │
// └─────────────────────────┘
import { ApiError, ApiResponse, SystemCustomErrorMsgByCode,  } from "@repo/shared";

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
// app.use("/api", router);

app.get("/health", (req, res) => {
  res.status(200).json(new ApiResponse(200, "OK"))
})


/* -------------------------------------------------------------------------- */
/*                          Error Handler Middleware                          */
/* -------------------------------------------------------------------------- */
app.use(errorHandlerMiddleware);

export const handler = serverless(app);
