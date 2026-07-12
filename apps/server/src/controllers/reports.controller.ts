import { asyncHandler } from "@/utils"
import { validateWithZod } from "@repo/shared"
import { reportZSchema } from "@repo/zod"



class ReportController {
    async createReport() {
        const payload = req.body;
        const { data, success } = validateWithZod(payload, reportZSchema.createReport)

        if(!success) {
            throw new ApiError(400)
        }

    }
}


const reportController = new ReportController()