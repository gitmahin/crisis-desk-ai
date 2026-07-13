import type { duplicateReportsTable, reportsTable, usersTable } from "./schemas";

// Users
export type PgUserSelectType = typeof usersTable.$inferSelect 
export type PgUserInsertType = typeof usersTable.$inferInsert 

// Reports
export type PgReportsSelectType = typeof reportsTable.$inferSelect
export type PgReportsInsertType = typeof reportsTable.$inferInsert

// Duplicate Reports
export type PgDuplReportsSelectType = typeof duplicateReportsTable.$inferSelect
export type PgDuplReportsInsertType = typeof duplicateReportsTable.$inferInsert

