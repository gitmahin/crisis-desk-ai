import mongoose, { Document, Schema } from "mongoose";



export interface ReportSchemaType extends Document {
    summary: string
    report_id: string
    user_id: string
    category: string
    embedding?: {
        type: number[],
        required: true
    }
}

export type ReportType = Partial<mongoose.InferSchemaType<typeof reportSchema>>

const reportSchema: Schema<ReportSchemaType> = new Schema({
    summary: {
        type: String,
        required: true
    },
    embedding: { type: [Number] },
});

export const reportModel = (mongoose.models.reportSchema as mongoose.Model<ReportSchemaType>) || mongoose.model<ReportSchemaType>("report_model", reportSchema)


