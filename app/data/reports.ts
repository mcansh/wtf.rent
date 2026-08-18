import * as s from "remix/data-schema"
import type { Database, SqlStatement } from "remix/data-table"
import { rawSql, sql } from "remix/data-table"

import type { CreateReportInput } from "../actions/post/report-input.ts"
import type { ReportFeedInput } from "../actions/post/report-input.ts"
import type { Post, User } from "./schema.ts"
import { posts, REPORT_CATEGORIES } from "./schema.ts"

export const REPORT_PAGE_SIZE = 20

const publicReportSummaryFields = {
  id: s.string(),
  title: s.string(),
  content: s.string(),
  city: s.nullable(s.string()),
  region: s.nullable(s.string()),
  landlordName: s.nullable(s.string()),
  category: s.nullable(s.enum_(REPORT_CATEGORIES)),
  rating: s.nullable(s.number()),
  createdAt: s.instanceof_(Date),
  username: s.string(),
}
const publicReportSummarySchema = s.object(publicReportSummaryFields)
const publicReportDetailSchema = s.object({
  ...publicReportSummaryFields,
  experienceConfirmedAt: s.nullable(s.instanceof_(Date)),
})

const reportCountSchema = s
  .union([s.number(), s.string(), s.bigint()])
  .transform(Number)
  .refine(
    (value) => Number.isSafeInteger(value) && value >= 0,
    "Expected a non-negative report count",
  )
const reportCountRowSchema = s.object({ total: reportCountSchema })

export type PublicReportSummary = s.InferOutput<typeof publicReportSummarySchema>
export type PublicReportDetail = s.InferOutput<typeof publicReportDetailSchema>

export interface PublicReportPage {
  hasNextPage: boolean
  hasPreviousPage: boolean
  page: number
  pageSize: number
  reports: PublicReportSummary[]
  total: number
  totalPages: number
}

export type CreateReportValues = Omit<CreateReportInput, "isFirsthand">

export interface CreateReportTrustedContext {
  authorId: User["id"]
  confirmedAt: Date
}

export async function createReport(
  database: Database,
  values: CreateReportValues,
  trusted: CreateReportTrustedContext,
): Promise<Post> {
  return database.create(
    posts,
    {
      address: values.address,
      city: values.city,
      region: values.region,
      landlordName: values.landlordName,
      category: values.category,
      rating: values.rating,
      title: values.title,
      content: values.content,
      authorId: trusted.authorId,
      experienceConfirmedAt: trusted.confirmedAt,
      status: "PUBLISHED",
    },
    { returnRow: true },
  )
}

export async function listPublicReports(
  database: Database,
  input: ReportFeedInput,
): Promise<PublicReportPage> {
  let where = createPublicReportWhere(input.likePattern)
  let offset = getReportPageOffset(input.page)
  let reportsStatement = sql`
    select
      p."id" as "id",
      p."title" as "title",
      p."content" as "content",
      p."city" as "city",
      p."region" as "region",
      p."landlordName" as "landlordName",
      p."category" as "category",
      p."rating" as "rating",
      p."createdAt" as "createdAt",
      u."username" as "username"
    from "Post" p
    inner join "User" u on u."id" = p."authorId"
    where ${where}
    order by p."createdAt" desc, p."id" desc
    limit ${REPORT_PAGE_SIZE}
    offset ${offset}
  `
  let countStatement = sql`
    select count(*) as "total"
    from "Post" p
    inner join "User" u on u."id" = p."authorId"
    where ${where}
  `
  let [reportsResult, countResult] = await Promise.all([
    database.exec(reportsStatement),
    database.exec(countStatement),
  ])
  let reports = s.parse(s.array(publicReportSummarySchema), reportsResult.rows ?? [])
  let countRows = s.parse(s.array(reportCountRowSchema), countResult.rows ?? [])
  let countRow = countRows[0]
  if (countRow == null) throw new Error("Expected the public report count query to return one row")

  let total = countRow.total
  let totalPages = total === 0 ? 0 : Math.ceil(total / REPORT_PAGE_SIZE)

  return {
    reports,
    total,
    page: input.page,
    pageSize: REPORT_PAGE_SIZE,
    totalPages,
    hasPreviousPage: input.page > 1,
    hasNextPage: input.page < totalPages,
  }
}

export async function findPublicReport(
  database: Database,
  id: Post["id"],
): Promise<PublicReportDetail | null> {
  let publicWhere = createPublicReportWhere(null)
  let statement = sql`
    select
      p."id" as "id",
      p."title" as "title",
      p."content" as "content",
      p."city" as "city",
      p."region" as "region",
      p."landlordName" as "landlordName",
      p."category" as "category",
      p."rating" as "rating",
      p."createdAt" as "createdAt",
      u."username" as "username",
      p."experienceConfirmedAt" as "experienceConfirmedAt"
    from "Post" p
    inner join "User" u on u."id" = p."authorId"
    where ${publicWhere} and p."id" = ${id}
    limit 1
  `
  let result = await database.exec(statement)
  let rows = s.parse(s.array(publicReportDetailSchema), result.rows ?? [])

  return rows[0] ?? null
}

function createPublicReportWhere(likePattern: string | null): SqlStatement {
  if (likePattern == null) return rawSql('p."status" = ?', ["PUBLISHED"])

  return rawSql(
    `
      p."status" = ?
      and (
        lower(coalesce(p."title", '')) like lower(?) escape '!'
        or lower(coalesce(p."content", '')) like lower(?) escape '!'
        or lower(coalesce(p."city", '')) like lower(?) escape '!'
        or lower(coalesce(p."region", '')) like lower(?) escape '!'
        or lower(coalesce(p."landlordName", '')) like lower(?) escape '!'
        or lower(
          coalesce(
            case p."category"
              when 'MAINTENANCE' then 'Maintenance'
              when 'RENT_INCREASE' then 'Rent increase'
              when 'FEES_OR_DEPOSIT' then 'Fees or deposit'
              when 'SAFETY' then 'Safety'
              when 'COMMUNICATION' then 'Communication'
              when 'GOOD_EXPERIENCE' then 'Good experience'
              when 'OTHER' then 'Other'
            end,
            ''
          )
        ) like lower(?) escape '!'
      )
    `,
    ["PUBLISHED", ...Array<string>(6).fill(likePattern)],
  )
}

function getReportPageOffset(page: number): number {
  let largestSafePage = Math.floor(Number.MAX_SAFE_INTEGER / REPORT_PAGE_SIZE) + 1
  return page > largestSafePage ? Number.MAX_SAFE_INTEGER : (page - 1) * REPORT_PAGE_SIZE
}
