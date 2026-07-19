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
    asyncHandler(reportResourceMiddleware.injectFindDuplicateResource),
    asyncHandler(useMCPResource),
    asyncHandler(reportToolMiddleware.injectCreateReportPayload.bind(reportToolMiddleware)), asyncHandler(useMCPTool)
  );

router
  .route("/:id")
  .get(asyncHandler(reportResourceMiddleware.injectGetReportByIdPayload.bind(reportResourceMiddleware)), asyncHandler(useMCPResource), asyncHandler(reportController.getReportById.bind(reportController)));

router
  .route("/:id")
  .patch(
    asyncHandler(AuthMiddlware),
    asyncHandler(reportToolMiddleware.injectUpdateReportPayload.bind(reportToolMiddleware)),
    asyncHandler(useMCPTool)
  );

router
  .route("/:id")
  .delete(
   asyncHandler( AuthMiddlware),
   asyncHandler( reportToolMiddleware.injectDeleteReportPayload.bind(reportToolMiddleware)),
   asyncHandler( useMCPTool)
  );

router
  .route("/stats/summary")
  .get(
    asyncHandler(reportResourceMiddleware.injectGetAnalylticsPayload.bind(reportResourceMiddleware)),
    asyncHandler(useMCPResource),
    asyncHandler(
      reportController.getReportsAnalyticsSummary.bind(reportController)
    )
  );

export default router;
