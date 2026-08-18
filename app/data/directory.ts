import * as s from "remix/data-schema"
import { rawSql, sql } from "remix/data-table"
import type { SqlStatement } from "remix/data-table"
import { getContext } from "remix/middleware/async-context"

import type { DirectoryInput } from "../actions/directory/input.ts"

export const DIRECTORY_PAGE_SIZE = 24

const directoryCountSchema = s
  .union([s.number(), s.string(), s.bigint()])
  .transform(Number)
  .refine(
    (value) => Number.isSafeInteger(value) && value >= 0,
    "Expected a non-negative directory count",
  )
const publicDirectoryEntrySchema = s.object({
  landlordName: s.string(),
  city: s.nullable(s.string()),
  region: s.nullable(s.string()),
  reportCount: directoryCountSchema,
})
const directoryCountRowSchema = s.object({ total: directoryCountSchema })

export type PublicDirectoryEntry = s.InferOutput<typeof publicDirectoryEntrySchema>

export interface PublicDirectoryPage {
  entries: PublicDirectoryEntry[]
  hasNextPage: boolean
  hasPreviousPage: boolean
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export async function listPublicDirectoryEntries(
  input: DirectoryInput,
): Promise<PublicDirectoryPage> {
  let database = getContext().db
  let where = createPublicDirectoryWhere(input.likePattern)
  let offset = getDirectoryPageOffset(input.page)
  let entriesStatement = sql`
    select
      p."landlordName" as "landlordName",
      p."city" as "city",
      p."region" as "region",
      count(*) as "reportCount"
    from "Post" p
    where ${where}
    group by p."landlordName", p."city", p."region"
    order by
      lower(p."landlordName"),
      lower(coalesce(p."city", '')),
      lower(coalesce(p."region", '')),
      p."landlordName",
      coalesce(p."city", ''),
      coalesce(p."region", '')
    limit ${DIRECTORY_PAGE_SIZE}
    offset ${offset}
  `
  let countStatement = sql`
    select count(*) as "total"
    from (
      select p."landlordName", p."city", p."region"
      from "Post" p
      where ${where}
      group by p."landlordName", p."city", p."region"
    ) as "directoryEntries"
  `
  let [entriesResult, countResult] = await Promise.all([
    database.exec(entriesStatement),
    database.exec(countStatement),
  ])
  let entries = s.parse(s.array(publicDirectoryEntrySchema), entriesResult.rows ?? [])
  let countRows = s.parse(s.array(directoryCountRowSchema), countResult.rows ?? [])
  let countRow = countRows[0]
  if (countRow == null) throw new Error("Expected the directory count query to return one row")

  let total = countRow.total
  let totalPages = total === 0 ? 0 : Math.ceil(total / DIRECTORY_PAGE_SIZE)

  return {
    entries,
    total,
    page: input.page,
    pageSize: DIRECTORY_PAGE_SIZE,
    totalPages,
    hasPreviousPage: input.page > 1,
    hasNextPage: input.page < totalPages,
  }
}

function createPublicDirectoryWhere(likePattern: string | null): SqlStatement {
  let publicEntry = `
    p."status" = ?
    and trim(coalesce(p."landlordName", '')) <> ''
  `
  if (likePattern == null) return rawSql(publicEntry, ["PUBLISHED"])

  return rawSql(
    `${publicEntry}
      and (
        lower(coalesce(p."landlordName", '')) like lower(?) escape '!'
        or lower(coalesce(p."city", '')) like lower(?) escape '!'
        or lower(coalesce(p."region", '')) like lower(?) escape '!'
      )
    `,
    ["PUBLISHED", likePattern, likePattern, likePattern],
  )
}

function getDirectoryPageOffset(page: number): number {
  let largestSafePage = Math.floor(Number.MAX_SAFE_INTEGER / DIRECTORY_PAGE_SIZE) + 1
  return page > largestSafePage ? Number.MAX_SAFE_INTEGER : (page - 1) * DIRECTORY_PAGE_SIZE
}
