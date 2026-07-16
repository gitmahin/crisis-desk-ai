import { postgres } from "@/libs";
import { reportsTable } from "@repo/database";
import { sql } from "drizzle-orm";

export const getPreparedReportStats = async () => {
    return postgres
        .select({
            totalReports: sql<number>`COUNT(*)::int`,
            criticalReports: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.urgency} = 'CRITICAL')::int`,
            pendingReports: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.status} = 'PENDING')::int`,
            resolvedReports: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.status} = 'RESOLVED')::int`,
            low: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.urgency} = 'LOW')::int`,
            medium: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.urgency} = 'MEDIUM')::int`,
            high: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.urgency} = 'HIGH')::int`,
            critical: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.urgency} = 'CRITICAL')::int`,
            fire: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.category} = 'FIRE')::int`,
            medical: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.category} = 'MEDICAL')::int`,
            flood: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.category} = 'FLOOD')::int`,
            utility: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.category} = 'UTILITY')::int`,
            accident: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.category} = 'ACCIDENT')::int`,
            crime: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.category} = 'CRIME')::int`,
            publicService: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.category} = 'PUBLIC_SERVICE')::int`,
            infrastructure: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.category} = 'INFRASTRUCTURE')::int`,
            other: sql<number>`COUNT(*) FILTER (WHERE ${reportsTable.category} = 'OTHER')::int`,
        })
        .from(reportsTable).prepare("prepareGetReportStats")
};