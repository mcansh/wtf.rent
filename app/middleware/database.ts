import { Database } from "remix/data-table"
import type { Middleware } from "remix/router"

import { db } from "../db.ts"

export function loadDatabase(database: Database = db): Middleware<{
  key: typeof Database
  value: Database
  property: "db"
}> {
  return (context, next) => {
    context.set(Database, database, { property: "db" })
    return next()
  }
}
