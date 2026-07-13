import {
    pgTable,
    pgEnum,
    primaryKey
} from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm";
import { REPORT_CATEGORY, REPORT_STATUS, SUPPORTED_LANGUAGES } from "@repo/constants"
import { table_timestamps } from "./helper";
import { v4 as uuidv4 } from "uuid"
import { usersTable } from "./users.schema";

/* -------------------------------------------------------------------------- */
/*                                   Enums                                    */
/* -------------------------------------------------------------------------- */

export const languageEnum = pgEnum("languageS", SUPPORTED_LANGUAGES);
export const reportCategoryEnum = pgEnum("report_categories", REPORT_CATEGORY);
export const reportStatusEnum = pgEnum("report_status", REPORT_STATUS);


/* -------------------------------------------------------------------------- */
/*                                   Tables                                   */
/* -------------------------------------------------------------------------- */
export const reportsTable = pgTable("reports", {
    id: t.uuid().primaryKey().notNull().unique().$defaultFn(uuidv4),
    user: t.uuid()
        .notNull()
        .references(() => usersTable.id, { onDelete: "cascade" }),
    location: t.varchar({ length: 255 }).notNull(),
    geo_location: t.jsonb().$type<{ lat: number, lng: number }>(),
    language: languageEnum().default("BN").notNull(),
    description: t.varchar({ length: 500 }).notNull(),
    category: reportCategoryEnum().notNull(),
    urgency: t.varchar(),
    summary: t.varchar(),
    suggested_action: t.varchar(),
    confidence: t.decimal(),
    status: reportStatusEnum().default("PENDING").notNull(),
    ...table_timestamps
});

export const duplicateReportsTable = pgTable(
    "duplicate_reports",
    {
        duplWith: t.uuid()
            .notNull()
            .references(() => reportsTable.id, { onDelete: "cascade" }),
        duplBy: t.uuid("dupl_by")
            .notNull()
            .references(() => reportsTable.id, { onDelete: "cascade" }),
        ...table_timestamps
    },
    (table) => ([
        primaryKey({ columns: [table.duplWith, table.duplBy] }),
    ])
);


/* -------------------------------------------------------------------------- */
/*                                  Relations                                 */
/* -------------------------------------------------------------------------- */
export const reportsTableRelations = relations(reportsTable, ({ one, many }) => ({
    submittedBy: one(usersTable, {
        fields: [reportsTable.user],
        references: [usersTable.id],
    }),
    duplicate_reports: many(duplicateReportsTable)
}));

export const duplicateReportsTableRelations = relations(duplicateReportsTable, ({ one }) => ({
    duplicateOf: one(reportsTable, {
        fields: [duplicateReportsTable.duplWith],
        references: [reportsTable.id],

    }),
    duplicateReport: one(reportsTable, {
        fields: [duplicateReportsTable.duplBy],
        references: [reportsTable.id],
    }),
}));