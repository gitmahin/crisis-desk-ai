import { reportsTable, usersTable} from "@repo/database"
import { postgres } from "@/lib/db.connect";


import { eq } from "drizzle-orm";

import { McpRegistrar } from "@/blueprints";

export class ReportResources extends McpRegistrar {
    registerAllReports() {
        this.server.registerResource("all-reports", "reports://all", {
            title: "All reports",
            description: "Returns all submitted incident reports, including reporter contact, location, category, and description. Useful for reviewing report history or checking for duplicates.",
            mimeType: "application/json",
        }, async (uri) => {
            try {
                const prepareReports = postgres.select({
                    id: reportsTable.id,
                    location: reportsTable.location,
                    geo_location: reportsTable.geo_location,
                    language: reportsTable.language,
                    description: reportsTable.description,
                    category: reportsTable.category,
                    urgency: reportsTable.urgency,
                    summary: reportsTable.summary,
                    suggested_action: reportsTable.suggested_action,
                    confidence: reportsTable.confidence,
                    status: reportsTable.status,
                    created_at: reportsTable.created_at,
                    updated_at: reportsTable.updated_at,
                    user: {
                        id: usersTable.id,
                        name: usersTable.name,
                        contact: usersTable.contact,
                        role: usersTable.role
                    }
                })
                    .from(reportsTable)
                    .leftJoin(usersTable, eq(reportsTable.user, usersTable.id)).prepare("get_all_reports");

                const reports = await prepareReports.execute()

                if (reports.length > 0) {
                    return {
                        contents: [
                            { uri: uri.href, text: JSON.stringify(reports), mimeType: "application/json" },
                        ],
                    };

                }

                return {
                    contents: [
                        { uri: uri.href, text: JSON.stringify({}) },
                    ],
                };

            } catch (error) {
                console.error("Failed to fetch reports:", error);
                return {
                    contents: [
                        { uri: uri.href, text: JSON.stringify({}) },
                    ],
                };

            }
        })
    }

    init() {
        this.registerAllReports()
    }
}
