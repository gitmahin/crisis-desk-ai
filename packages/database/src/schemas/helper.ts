import * as t from "drizzle-orm/pg-core";

// Table Timestamps
export const table_timestamps = {
  updated_at: t.timestamp(),
  created_at: t.timestamp().defaultNow().notNull(),
};

// Table Deletion
export const is_deleted = {
  is_deleted: t.boolean().default(false).notNull(),
  deleted_at: t.timestamp(),
};
