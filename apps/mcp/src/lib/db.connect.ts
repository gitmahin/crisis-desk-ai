import { Postgres } from "@repo/shared";
import * as schema from "@repo/database";
import { baseConfig } from "@/config";

export const postgres = new Postgres().createConnection(
  baseConfig.DATABASE_URL,
  schema
);
