
import { connectRedis, reportRedis } from "@/libs";
import { groq } from "@/libs/ai-models";
import { CREATE_NEW_REPORT_TOOL_NAME, DELETE_REPORT_TOOL_NAME, MODEL_CRN_HEADER_KEY, UPDATE_REPORT_TOOL_NAME } from "@repo/constants";
import { ApiError, ApiResponse, convertToValidJson, getSystemCustomErrorMsgByKey, validateWithZod } from "@repo/shared";
import { reportZSchema, type GetReportByIdPayloadType, type UpdateReportPayloadType } from "@repo/zod";
import { generateText } from "ai";
import type { NextFunction, Request, Response } from "express";
import z4 from "zod/v4";


type DuplicateResponseDataType = {
    possibleDuplicate: boolean;
    matchedReportId: string;
};

interface IReportToolPaylodInjectorMiddleware {
    injectCreateReportPayload(req: Request, res: Response, next: NextFunction): Promise<Response | void>
    injectUpdateReportPayload(req: Request, res: Response, next: NextFunction): Promise<Response | void>
    injectDeleteReportPayload(req: Request, res: Response, next: NextFunction): Promise<Response | void>
}

export class ReportToolPaylodInjectorMiddleware implements IReportToolPaylodInjectorMiddleware {


    async injectCreateReportPayload(req: Request, res: Response, next: NextFunction) {
        const payload = req.body;

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


        const model_crn = req.headers[MODEL_CRN_HEADER_KEY] as string
        const { text: model_response } = await generateText({
            model: groq(model_crn ?? "openai/gpt-oss-20b"),
            instructions: `Compare the new report to the existing reports list. Flag as a duplicate only if it describes the same real-world incident: same/similar location, same category, and a description matching the same event (wording, contact info, or timestamp differences don't matter).

            Existing reports: ${JSON.stringify(req.resourceResult)}
            New report: ${JSON.stringify(data)}

            Return ONLY this JSON, no prose, no markdown:
            {"possibleDuplicate": boolean, "matchedReportId": string | null}

            - true only for a clear, confident match; if multiple match, pick the closest one.
            - matchedReportId = the matched report's "id", else null.
            - If reports list is empty/missing/invalid, or you're unsure for any reason, return {"possibleDuplicate": false, "matchedReportId": null}.`,
            messages: [
                { role: "user", content: "Check if this new report is a duplicate." },
            ],
        });

        const parsed_model_response: DuplicateResponseDataType =
            convertToValidJson(model_response);
        console.log("here it is", parsed_model_response)

        if (parsed_model_response.possibleDuplicate) {
            throw new ApiError(
                400,
                getSystemCustomErrorMsgByKey("DUPLICATE_REPORT_FOUND")!,
                "",
                [parsed_model_response]
            );
        }


        req.value = data
        req.toolName = CREATE_NEW_REPORT_TOOL_NAME

        return next()
    }


    async injectDeleteReportPayload(req: Request, res: Response, next: NextFunction) {
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

        req.value = data
        req.toolName = DELETE_REPORT_TOOL_NAME

        return next()
    }

    async injectUpdateReportPayload(req: Request, res: Response, next: NextFunction) {
        const body = req.body;
        const params = req.params;

        const payload: UpdateReportPayloadType = {
            id: params?.id as string,
            ...body
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

        req.value = data
        req.toolName = UPDATE_REPORT_TOOL_NAME

        return next()
    }
}

interface IReportRsrcPayloadInjectorMiddleware {
    injectFindDuplicateResource(req: Request, res: Response, next: NextFunction): Promise<Response | void>
    injectGetReportByIdPayload(req: Request, res: Response, next: NextFunction): Promise<Response | void>
    injectGetAllReportsPayload(req: Request, res: Response, next: NextFunction): Promise<Response | void>
    injectGetAnalylticsPayload(req: Request, res: Response, next: NextFunction): Promise<Response | void>
}

export class ReportRsrcPayloadInjectorMiddleware implements IReportRsrcPayloadInjectorMiddleware {

    async injectFindDuplicateResource(req: Request, res: Response, next: NextFunction) {
        const payload = req.body
        req.resourceUri = `reports://similar/${encodeURIComponent(JSON.stringify(payload))}/`
        return next()
    }

    async injectGetAllReportsPayload(req: Request, res: Response, next: NextFunction) {
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

        if (data?.category) params.set('category', data.category);
        if (data?.urgency) params.set('urgency', data.urgency);
        if (data?.page) params.set("page", String(data.page))

        const uri = `reports://all/${data?.page ?? 1}/${data?.category ?? 'none'}/${data?.urgency ?? 'none'}`;
        req.resourceUri = uri

        return next()
    }

    async injectGetReportByIdPayload(req: Request, res: Response, next: NextFunction) {
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

        req.resourceUri = uri
        return next()
    }

    async injectGetAnalylticsPayload(req: Request, res: Response, next: NextFunction) {

        await connectRedis()

        const [cache_result, message] = await reportRedis.getCachedReportAnalytics(req.clientIp as string)

        if (cache_result) {
            return res.status(200).json(new ApiResponse(200, message ? `OK with WARNING: ${message}` : "OK", cache_result));
        }

        const uri = "reports://analytics"
        req.resourceUri = uri
        return next()
    }
}