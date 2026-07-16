import z4 from "zod/v4";
import {
  REPORT_CATEGORY,
  REPORT_STATUS,
  REPORT_URGENCY,
  SUPPORTED_LANGUAGES,
} from "@repo/constants";

class ReportZSchema {

  static id = z4
    .uuid({ error: "Invalid Id!" })
    .nonempty({ error: "Id is required!" });

  createReport = z4.object({
    name: z4
      .string({ error: "Invalid Name!" })
      .nonempty({ error: "Name cannot be empty!" })
      .max(255, { error: "" }),
    contact: z4
      .string({ error: "Invalid Contact!" })
      .nonempty({ error: "Phone number cannot be empty!" })
      .max(20, { error: "" }),
    location: z4
      .string({ error: "Invalid Location!" })
      .nonempty({ error: "Location cannot be empty!" })
      .max(255, { error: "" }),
    // In database description max length is 1000.
    description: z4
      .string({ error: "Invalid Description!" })
      .nonempty({ error: "Description cannot be empty!" })
      .max(500, { error: "" }),
    language: z4
      .enum(SUPPORTED_LANGUAGES)
      .nonoptional({ error: "Language is required!" }),
    model_crn: z4.string({error: "Invalid model crn!"}).max(255, {error: "Model crn is too long!"}).optional()
  });

  getReportById = z4.object({
    id: ReportZSchema.id,
  });

  getReportByQueryParams = z4.object({
    category: z4.enum(REPORT_CATEGORY).optional(),
    urgency: z4.enum(REPORT_URGENCY).optional(),
    page: z4.number().optional()
  });

  updateReportStatus = z4.object({
    id: ReportZSchema.id,
    status: z4.enum(REPORT_STATUS),
  });
}

export const reportZSchema = new ReportZSchema();

// Types
export type CreateReportPayloadType = z4.infer<
  typeof reportZSchema.createReport
>;
export type GetReportByIdPayloadType = z4.infer<
  typeof reportZSchema.getReportById
>;
export type GetReportByQueryParamsPayloadType = z4.infer<
  typeof reportZSchema.getReportByQueryParams
>;
export type UpdateReportPayloadType = z4.infer<
  typeof reportZSchema.updateReportStatus
>;
