import {
    pgTable,
    pgEnum,
} from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm";
import { USER_ROLE } from "@repo/constants"
import { table_timestamps } from "./helper";
import { v4 as uuidv4 } from "uuid"
import { reportsTable } from "./reports.schema";

/* -------------------------------------------------------------------------- */
/*                                   Enums                                    */
/* -------------------------------------------------------------------------- */
export const userRoleEnum = pgEnum("user_role", USER_ROLE);

/* -------------------------------------------------------------------------- */
/*                                   Tables                                   */
/* -------------------------------------------------------------------------- */

export const usersTable = pgTable("users", {
    id: t.uuid().primaryKey().notNull().unique().$defaultFn(uuidv4),
    role: userRoleEnum().default("USER").notNull(),
    name: t.varchar({ length: 255 }).notNull(),
    contact: t.varchar({ length: 20 }).notNull(),
    ...table_timestamps
});

/* -------------------------------------------------------------------------- */
/*                                  Relations                                 */
/* -------------------------------------------------------------------------- */

export const usersTableRelations = relations(usersTable, ({ many }) => ({
    reports: many(reportsTable),
}));