import { Pool } from "pg"
import { createPostgresDatabase } from "remix/data-table/postgres"

import { env } from "./env.ts"

const pool = new Pool({ connectionString: env.DATABASE_URL })

export const db = createPostgresDatabase(pool)
