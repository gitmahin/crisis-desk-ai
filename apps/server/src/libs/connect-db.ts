import { Postgres } from "@repo/shared";
import * as schema from "@repo/database";
import { BaseConfig } from "@/config";

export const postgres = new Postgres().createConnection(
  BaseConfig.DATABASE_URI,
  schema
);
