import { Router } from "express";
import { ReportController } from "@/controllers";
import { asyncHandler } from "@/utils";
import { AuthMiddlware } from "@/middlewares/auth.middleware";

const router: Router = Router();

const reportController = new ReportController();

router
  .route("/")
  .get(asyncHandler(reportController.getAllReports.bind(reportController)));
router
  .route("/")
  .post(asyncHandler(reportController.createReport.bind(reportController)));
router
  .route("/:id")
  .get(asyncHandler(reportController.getReportById.bind(reportController)));
router
  .route("/:id/status")
  .patch(
    AuthMiddlware,
    asyncHandler(reportController.updateReportStatus.bind(reportController))
  );
router
  .route("/:id")
  .delete(
    AuthMiddlware,
    asyncHandler(reportController.deleteReportById.bind(reportController))
  );
router
  .route("/stats/summary")
  .get(
    asyncHandler(
      reportController.getReportsAnalyticsSummary.bind(reportController)
    )
  );

export default router;
