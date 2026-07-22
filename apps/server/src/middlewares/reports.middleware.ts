import { connectRedis, reportRedis } from "@/libs";
import { groq } from "@/libs/ai-models";
import {
  CREATE_NEW_REPORT_TOOL_NAME,
  DELETE_REPORT_TOOL_NAME,
  MODEL_CRN_HEADER_KEY,
  UPDATE_REPORT_TOOL_NAME,
} from "@repo/constants";
import {
  ApiError,
  ApiResponse,
  convertToValidJson,
  getSystemCustomErrorMsgByKey,
  validateWithZod,
} from "@repo/shared";
import {
  reportZSchema,
  type GetReportByIdPayloadType,
  type UpdateReportPayloadType,
} from "@repo/zod";
import { generateText } from "ai";
import type { NextFunction, Request, Response } from "express";
import z4 from "zod/v4";

type DuplicateResponseDataType = {
  possibleDuplicate: boolean;
  matchedReportId: string;
};

interface IReportToolPaylodInjectorMiddleware {
  injectCreateReportPayload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void>;
  injectUpdateReportPayload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void>;
  injectDeleteReportPayload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void>;
}

/**
 * Middleware responsible for preparing data for MCP Tool execution.
 *
 * This class validates incoming JSON payloads and attaches the validated
 * data to the request object for the downstream MCP client.
 */
export class ReportToolPaylodInjectorMiddleware implements IReportToolPaylodInjectorMiddleware {
  /**
   * Prepares the payload for creating a new report.
   *
   * @remarks
   * Includes a **Semantic Deduplication Guard**:
   * It uses previously fetched "similar reports" (from req.resourceResult) and
   * asks an LLM to determine if the new report is a duplicate of an existing one.
   *
   * @throws {ApiError} 400 if validation fails or a duplicate is found.
   */
  async injectCreateReportPayload(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const payload = req.resourceResult
      ? {
          ...(req.body as any),
          resourceResult: JSON.stringify(req.resourceResult),
        }
      : req.body;

    const { data, success, error } = validateWithZod(
      payload,
      reportZSchema.createReport
    );

    if (!success) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("CREATE_REPORT_PAYLOAD_ERROR")!,
        "",
        [z4.flattenError(error)]
      );
    }

    req.value = data;
    req.toolName = CREATE_NEW_REPORT_TOOL_NAME;

    return next();
  }

  /**
   * Maps a URL ID parameter to the 'delete' tool argument.
   */
  async injectDeleteReportPayload(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const params = req.params;
    const payload: GetReportByIdPayloadType = {
      id: params?.id as string,
    };

    const { data, success, error } = validateWithZod(
      payload,
      reportZSchema.getReportById
    );

    if (!success) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("GET_REPORT_BY_ID_PAYLOAD_ERROR")!,
        "",
        [z4.flattenError(error)]
      );
    }

    req.value = data;
    req.toolName = DELETE_REPORT_TOOL_NAME;

    return next();
  }

  /**
   * Merges URL ID and Body data for the 'update' tool.
   */
  async injectUpdateReportPayload(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const body = req.body;
    const params = req.params;

    const payload: UpdateReportPayloadType = {
      id: params?.id as string,
      ...body,
    };

    const { data, success, error } = validateWithZod(
      payload,
      reportZSchema.updateReport
    );
    if (!success) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("UPDATE_REPORT_STS_PAYLOAD_ERROR")!,
        "",
        [z4.flattenError(error)]
      );
    }

    req.value = data;
    req.toolName = UPDATE_REPORT_TOOL_NAME;

    return next();
  }
}

interface IReportRsrcPayloadInjectorMiddleware {
  injectFindDuplicateResource(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void>;
  injectGetReportByIdPayload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void>;
  injectGetAllReportsPayload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void>;
  injectGetAnalylticsPayload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void>;
}

/**
 * Middleware responsible for constructing MCP Resource URIs.
 */
export class ReportRsrcPayloadInjectorMiddleware implements IReportRsrcPayloadInjectorMiddleware {
  /**
   * Generates a URI for semantic similarity search based on the report body.
   */
  async injectFindDuplicateResource(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const payload = req.body;
    // Encoding the payload into the URI for the MCP similarity tool
    req.resourceUri = `reports://similar/${encodeURIComponent(JSON.stringify(payload))}/`;
    return next();
  }

  /**
   * Transforms query filters into a MCP Resource URI.
   */
  async injectGetAllReportsPayload(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const queryParams = req.query;

    const { data, success, error } = validateWithZod(
      queryParams,
      reportZSchema.getReportByQueryParams
    );

    if (!success) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("GET_REPORT_BY_QUERY_PAYLOAD_ERROR")!,
        "",
        [z4.flattenError(error)]
      );
    }

    const params = new URLSearchParams();

    if (data?.category) params.set("category", data.category);
    if (data?.urgency) params.set("urgency", data.urgency);
    if (data?.page) params.set("page", String(data.page));

    const uri = `reports://all/${data?.page ?? 1}/${data?.category ?? "none"}/${data?.urgency ?? "none"}`;
    req.resourceUri = uri;

    return next();
  }

  /**
   * Constructs a specific resource URI for a report by its ID.
   */
  async injectGetReportByIdPayload(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const params = req.params;
    const payload: GetReportByIdPayloadType = {
      id: params?.id as string,
    };

    const { data, success, error } = validateWithZod(
      payload,
      reportZSchema.getReportById
    );

    if (!success) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("GET_REPORT_BY_ID_PAYLOAD_ERROR")!,
        "",
        [z4.flattenError(error)]
      );
    }

    const uri = `reports://all/id/${data?.id}`;

    req.resourceUri = uri;
    return next();
  }

  /**
   * Handles the analytics payload with a "Short-Circuit" cache logic.
   *
   * @remarks
   * If analytics for the client IP are in Redis, it returns the response
   * immediately, skipping the MCP call entirely.
   */
  async injectGetAnalylticsPayload(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    await connectRedis();

    const [cache_result, message] = await reportRedis.getCachedReportAnalytics(
      req.clientIp as string
    );

    if (cache_result) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            message ? `OK with WARNING: ${message}` : "OK",
            cache_result
          )
        );
    }

    const uri = "reports://analytics";
    req.resourceUri = uri;
    return next();
  }
}
