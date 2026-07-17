import { Router } from "express";
import { ReportController } from "@/controllers";
import { asyncHandler } from "@/utils";
import { AuthMiddlware } from "@/middlewares/auth.middleware";
import { ReportRsrcPayloadInjectorMiddleware, ReportToolPaylodInjectorMiddleware } from "@/middlewares/reports.middleware";
import { useMCPResource } from "@/middlewares/mcp/resource.middleware";
import { useMCPTool } from "@/middlewares/mcp/tool.middleware";

const router: Router = Router();

const reportController = new ReportController();
const reportToolMiddleware = new ReportToolPaylodInjectorMiddleware()
const reportResourceMiddleware = new ReportRsrcPayloadInjectorMiddleware()

router
  .route("/")
  .get(asyncHandler(reportController.getAllReports.bind(reportController)));

router
  .route("/")
  .post(
    reportToolMiddleware.injectCreateReportPayload.bind(reportToolMiddleware), useMCPTool
  );

router
  .route("/:id")
  .get(reportResourceMiddleware.injectGetReportByIdPayload.bind(reportResourceMiddleware), useMCPResource, asyncHandler(reportController.getReportById.bind(reportController)));

router
  .route("/:id")
  .patch(
    AuthMiddlware,
    reportToolMiddleware.injectUpdateReportPayload.bind(reportToolMiddleware),
    useMCPTool
  );

router
  .route("/:id")
  .delete(
    AuthMiddlware,
    reportToolMiddleware.injectDeleteReportPayload.bind(reportToolMiddleware),
    useMCPTool
  );

router
  .route("/stats/summary")
  .get(
    reportResourceMiddleware.injectGetAnalylticsPayload,
    useMCPResource,
    asyncHandler(
      reportController.getReportsAnalyticsSummary.bind(reportController)
    )
  );

export default router;
