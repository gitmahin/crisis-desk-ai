import { asyncHandler } from "@/utils"
import { validateWithZod, getSystemCustomErrorMsgByKey, ApiResponse, ApiError, } from "@repo/shared"
import { reportZSchema, type GetReportByIdPayloadType, type UpdateReportPayloadType } from "@repo/zod"
import type { Request, Response } from "express"
import z4 from "zod/v4";



export class ReportController {

    async createReport(req: Request, res: Response) {
        const payload = req.body;

        const { data, success, error } = validateWithZod(payload, reportZSchema.createReport)

        if (!success) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("CREATE_REPORT_PAYLOAD_ERROR")!, "", [z4.flattenError(error)])
        }

        return res.status(201).json(new ApiResponse(201, "Report Created", { id: "report_id" }))

    }

    async updateReportStatus(req: Request, res: Response) {
        const body = req.body
        const params = req.params

        const payload: UpdateReportPayloadType = {
            id: params?.id as string,
            status: body?.status
        }

        const { data, success, error } = validateWithZod(payload, reportZSchema.updateReportStatus)
        if (!success) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("UPDATE_REPORT_STS_PAYLOAD_ERROR")!, "", [z4.flattenError(error)])
        }

        return res.status(200).json(new ApiResponse(200, "Report Updated"))

    }


    async getAllReports(req: Request, res: Response) {
        const queryParams = req.query

        const { data, success, error } = validateWithZod(queryParams, reportZSchema.getReportByQueryParams)

        if (!success) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("GET_REPORT_BY_QUERY_PAYLOAD_ERROR")!, "", [z4.flattenError(error)])
        }

        return res.status(200).json(new ApiResponse(200, "OK", []))


    }

    async getReportById(req: Request, res: Response) {
        const params = req.params
        const payload: GetReportByIdPayloadType = {
            id: params?.id as string
        }

        const { data, success, error } = validateWithZod(payload, reportZSchema.getReportByQueryParams)

        if (!success) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("GET_REPORT_BY_ID_PAYLOAD_ERROR")!, "", [z4.flattenError(error)])
        }

        return res.status(200).json(new ApiResponse(200, "OK", []))


    }



    async deleteReportById(req: Request, res: Response) {
        const params = req.params
        const payload: GetReportByIdPayloadType = {
            id: params?.id as string
        }

        const { data, success, error } = validateWithZod(payload, reportZSchema.getReportByQueryParams)

        if (!success) {
            throw new ApiError(400, getSystemCustomErrorMsgByKey("GET_REPORT_BY_ID_PAYLOAD_ERROR")!, "", [z4.flattenError(error)])
        }

        return res.status(200).json(new ApiResponse(200, "OK", []))


    }

    async getReportsAnalyticsSummary(req: Request, res: Response) {
    
        return res.status(200).json(new ApiResponse(200, "OK", []))


    }

}
