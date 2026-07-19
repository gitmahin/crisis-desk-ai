import { Router } from "express";
const router: Router = Router();

// Routers imports
import reportRouter from "./reports.route";
import userRouter from "./user.route";
import { ReportRsrcPayloadInjectorMiddleware } from "@/middlewares/reports.middleware";
import { useMCPResource } from "@/middlewares/mcp/resource.middleware";
import { attachAgent } from "@/middlewares/mcp/tool.middleware";


const reportResourceMiddleware = new ReportRsrcPayloadInjectorMiddleware()
router.use("/v1/reports", reportRouter);
router.use("/v1/user", userRouter);
router.use("/agent", reportResourceMiddleware.injectFindDuplicateResource.bind(reportResourceMiddleware), useMCPResource, attachAgent )

export default router;
