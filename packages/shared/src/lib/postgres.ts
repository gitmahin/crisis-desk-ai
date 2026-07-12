/**
 * @file Shared Database Utilities
 * @description Provides a centralized, reusable PostgreSQL connection factory using Drizzle ORM.
 *
 * ┌────────────────────────────────────────────┐
 * │ DESIGN RATIONALE                           │
 * ├────────────────────────────────────────────┤
 * │ This class is part of the @repo/shared     │
 * │ package to ensure consistent DB connection │
 * │ logic, logger configurations, and naming   │
 * │ conventions (snake_case) across all micro- │
 * │ services in the monorepo.                  │
 * └────────────────────────────────────────────┘
 */

import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

/**
 * A generic PostgreSQL connection manager.
 *
 * @template T - The Drizzle schema object type used for type-safe queries.
 */
export class Postgres<T extends Record<string, unknown>> {
  private pgDb!: NodePgDatabase<T> & { $client: Pool };

  /**
   * Initializes a connection to the PostgreSQL database.
   *
   * @param connection_uri - The full PostgreSQL connection string.
   * @param schema - The Drizzle schema object containing table definitions and relations.
   *
   * @returns An initialized Drizzle database instance.
   *
   * @throws {Error} If the connection_uri is an empty string.
   *
   * @example
   * const db = new Postgres().createConnection(env.DATABASE_URL, schema);
   */
  createConnection(connection_uri: string, schema: T) {
    if (connection_uri == "") throw new Error("Connection URI is required");

    this.pgDb = drizzle(connection_uri, {
      schema,
      logger: process.env.NODE_ENV !== "production",
      casing: "snake_case",
    });

    return this.pgDb;
  }
}
