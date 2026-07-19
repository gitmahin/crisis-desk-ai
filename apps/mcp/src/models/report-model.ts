import mongoose, { Document, Schema } from "mongoose";



export interface ReportSchemaType extends Document {
    summary: string
    report_id: string
    embedding?: {
        type: number[],
        required: true
    }
}

export type ReportType = Partial<mongoose.InferSchemaType<typeof reportSchema> > & Partial<{
    user_id: string
    category: string
    created_at: string
}>

const reportSchema: Schema<ReportSchemaType> = new Schema({
    // dont make anything here unique true
    // as database will save chunk of data if data is large
    // in worst case data saving will fail for unique constraint
    report_id: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        required: true
    },
    embedding: { type: [Number] },
});

export const reportModel = (mongoose.models.reportSchema as mongoose.Model<ReportSchemaType>) || mongoose.model<ReportSchemaType>("report_model", reportSchema)


