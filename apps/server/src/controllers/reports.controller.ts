import { ApiResponse } from "@repo/shared";
import type { Request, Response } from "express";
import "dotenv/config";
import { reportRedis } from "@/libs/redis";

export class ReportController {
  async updateReport(req: Request, res: Response) {
    return res.status(200).json(new ApiResponse(200, "Report Updated."));
  }

  async getAllReports(req: Request, res: Response) {
    // Don't return an error here. During filtering,
    // having no matching products is a valid result, not an error.
    return res.status(200).json(new ApiResponse(200, "OK", req.resourceResult));
  }

  async getReportById(req: Request, res: Response) {
    return res.status(200).json(new ApiResponse(200, "OK", req.resourceResult));
  }

  async deleteReportById(req: Request, res: Response) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, "Report deleted successfully", req.toolResult)
      );
  }

  async getReportsAnalyticsSummary(req: Request, res: Response) {
    await reportRedis.cacheReportAnalytics(
      req.clientIp as string,
      req.resourceResult
    );
    return res.status(200).json(new ApiResponse(200, "OK", req.resourceResult));
  }
}
