import { ApiResponse } from "@repo/shared";
import type { Request, Response } from "express";
import "dotenv/config";
import { reportRedis } from "@/libs/redis";

/**
 * Controller for handling Report-related HTTP requests.
 *
 * This class acts as the final sink in the middleware chain,
 * returning data that has been fetched or modified via MCP.
 */
export class ReportController {
  /**
   * Confirms a report update.
   */
  async updateReport(req: Request, res: Response) {
    return res.status(200).json(new ApiResponse(200, "Report Updated."));
  }

  /**
   * Returns a list of reports.
   * Data is sourced from `req.resourceResult`, populated by the {@link useMCPResource} middleware.
   */
  async getAllReports(req: Request, res: Response) {
    // Don't return an error here. During filtering,
    // having no matching products is a valid result, not an error.
    return res.status(200).json(new ApiResponse(200, "OK", req.resourceResult));
  }

  /**
   * Returns a single report by ID.
   */
  async getReportById(req: Request, res: Response) {
    return res.status(200).json(new ApiResponse(200, "OK", req.resourceResult));
  }

  /**
   * Returns result of a deletion tool call.
   * Data is sourced from `req.toolResult`, populated by {@link useMCPTool}.
   */
  async deleteReportById(req: Request, res: Response) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, "Report deleted successfully", req.toolResult)
      );
  }

  /**
   * Returns report analytics and caches the result in Redis for the specific client IP.
   */
  async getReportsAnalyticsSummary(req: Request, res: Response) {
    await reportRedis.cacheReportAnalytics(
      req.clientIp as string,
      req.resourceResult
    );
    return res.status(200).json(new ApiResponse(200, "OK", req.resourceResult));
  }
}
