import { Postgres, sharedConfig } from "@repo/shared"
import * as schema from "@repo/database"

export const postgres = new Postgres().createConnection(sharedConfig.DATABASE_URL, schema)