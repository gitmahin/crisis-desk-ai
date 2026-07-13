import type { Postgres } from "@repo/shared";
import { sql } from "drizzle-orm";

export async function resetDb<T extends Record<string, unknown>>(
  postgres: ReturnType<Postgres<T>["createConnection"]>
) {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Database reset is disabled in production.");
    process.exit(1);
  }
  try {
    console.log("⏳ Resetting database...");
    const start = Date.now();

    const sqlQueries = sql`
                        -- Delete all tables
                        DO $$ DECLARE
                            r RECORD;
                        BEGIN
                            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                            END LOOP;
                        END $$;

                        -- Delete enums
                        DO $$ DECLARE
                            r RECORD;
                        BEGIN
                            FOR r IN (select t.typname as enum_name
                            from pg_type t 
                                join pg_enum e on t.oid = e.enumtypid  
                                join pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                            where n.nspname = current_schema()) LOOP
                                EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.enum_name);
                            END LOOP;
                        END $$;

                        -- Delete all schemas except system defaults
                        DO $$
                        DECLARE
                            f_rec record;
                        BEGIN
                            FOR f_rec IN 
                                SELECT schema_name::text 
                                FROM information_schema.schemata
                                WHERE schema_name <> 'pg_toast'
                                AND schema_name <> 'pg_catalog'
                                AND schema_name <> 'public'
                                AND schema_name <> 'information_schema'
                                AND schema_name NOT LIKE 'pg_temp_%'
                            LOOP
                                EXECUTE 'DROP SCHEMA ' || quote_ident(f_rec.schema_name) || ' CASCADE';
                            END LOOP;
                        END $$;
                    `;

    await postgres.execute(sqlQueries);

    const end = Date.now();
    console.log(`✅ Reset end & took ${end - start}ms\n`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Reset failed");
    console.error(error);
    process.exit(1);
  }
}
