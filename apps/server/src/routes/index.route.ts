import { Router } from "express";
const router: Router = Router();

// Routers imports
import reportRouter from "./reports.route";
import userRouter from "./user.route";
import { ReportRsrcPayloadInjectorMiddleware } from "@/middlewares/reports.middleware";
import { useMCPResource } from "@/middlewares/mcp/resource.middleware";
import { attachAgent } from "@/middlewares/mcp/tool.middleware";
import { asyncHandler } from "@/utils";


const reportResourceMiddleware = new ReportRsrcPayloadInjectorMiddleware()
router.use("/v1/reports", reportRouter);
router.use("/v1/user", userRouter);
router.route("/agent").post(
    asyncHandler(reportResourceMiddleware.injectFindDuplicateResource.bind(reportResourceMiddleware)), asyncHandler(useMCPResource), asyncHandler(attachAgent)
)

export default router;
