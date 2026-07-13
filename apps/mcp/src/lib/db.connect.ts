import { baseConfig } from "@/config"
import { Postgres } from "@repo/shared"
import * as schema from "@repo/database"

export const postgres = new Postgres().createConnection(baseConfig.DATABASE_URL, schema)