import * as s from "remix/data-schema"
import type { Database, SqlStatement } from "remix/data-table"
import { rawSql, sql } from "remix/data-table"

import type {
  ReportSuggestion,
  ReportSuggestionKind,
} from "../actions/home-page/public/suggestion-contract.ts"
import { REPORT_SUGGESTION_LIMIT } from "../actions/home-page/public/suggestion-contract.ts"
import type { ReportSuggestionInput } from "../actions/home-page/suggestion-input.ts"
import type { CreateReportInput } from "../actions/post/report-input.ts"
import type { ReportFeedInput } from "../actions/post/report-input.ts"
import { REPORT_CATEGORY_LABELS } from "../actions/post/report-input.ts"
import type { Post, User } from "./schema.ts"
import { posts, REPORT_CATEGORIES } from "./schema.ts"

export const REPORT_PAGE_SIZE = 20

const REPORT_SUGGESTION_CANDIDATE_LIMIT = REPORT_SUGGESTION_LIMIT * 3

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
const reportLocationSuggestionRowSchema = s.object({
  context: s.nullable(s.string()),
  kind: s.enum_(["city", "region"]),
  label: s.string(),
  total: reportCountSchema,
})
const reportLandlordSuggestionRowSchema = s.object({
  landlordName: s.string(),
  total: reportCountSchema,
})
const reportCategorySuggestionRowSchema = s.object({
  category: s.enum_(REPORT_CATEGORIES),
  total: reportCountSchema,
})

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

export async function listPublicReportSuggestions(
  database: Database,
  input: ReportSuggestionInput,
): Promise<ReportSuggestion[]> {
  if (input.likePattern == null || input.prefixPattern == null) return []

  let normalizedQuery = input.q.toLowerCase()
  let matchesCategory = REPORT_CATEGORIES.some((category) =>
    REPORT_CATEGORY_LABELS[category].toLowerCase().includes(normalizedQuery),
  )

  let locationStatement = sql`
    with "locationSuggestions" as (
      select
        'city' as "kind",
        min(trim(p."city")) as "label",
        case
          when count(distinct lower(nullif(trim(p."region"), ''))) = 1
            then min(nullif(trim(p."region"), ''))
          else null
        end as "context",
        count(*) as "total"
      from "Post" p
      where p."status" = ${"PUBLISHED"}
        and trim(coalesce(p."city", '')) <> ''
        and lower(trim(p."city")) like lower(${input.likePattern}) escape '!'
      group by lower(trim(p."city"))

      union all

      select
        'region' as "kind",
        min(trim(p."region")) as "label",
        null as "context",
        count(*) as "total"
      from "Post" p
      where p."status" = ${"PUBLISHED"}
        and trim(coalesce(p."region", '')) <> ''
        and lower(trim(p."region")) like lower(${input.likePattern}) escape '!'
      group by lower(trim(p."region"))
    )
    select "kind", "label", "context", "total"
    from "locationSuggestions"
    order by
      case
        when lower("label") = lower(${input.q}) then 0
        when lower("label") like lower(${input.prefixPattern}) escape '!' then 1
        else 2
      end,
      "total" desc,
      case "kind" when 'city' then 0 else 1 end,
      lower("label")
    limit ${REPORT_SUGGESTION_CANDIDATE_LIMIT}
  `
  let landlordStatement = sql`
    with "landlordSuggestions" as (
      select
        min(trim(p."landlordName")) as "landlordName",
        count(*) as "total"
      from "Post" p
      where p."status" = ${"PUBLISHED"}
        and trim(coalesce(p."landlordName", '')) <> ''
        and lower(trim(p."landlordName")) like lower(${input.likePattern}) escape '!'
      group by lower(trim(p."landlordName"))
    )
    select "landlordName", "total"
    from "landlordSuggestions"
    order by
      case
        when lower("landlordName") = lower(${input.q}) then 0
        when lower("landlordName") like lower(${input.prefixPattern}) escape '!' then 1
        else 2
      end,
      "total" desc,
      lower("landlordName")
    limit ${REPORT_SUGGESTION_CANDIDATE_LIMIT}
  `
  let categoryStatement = sql`
    select
      p."category" as "category",
      count(*) as "total"
    from "Post" p
    where p."status" = ${"PUBLISHED"}
      and p."category" is not null
      and lower(
        case p."category"
          when 'MAINTENANCE' then 'Maintenance'
          when 'RENT_INCREASE' then 'Rent increase'
          when 'FEES_OR_DEPOSIT' then 'Fees or deposit'
          when 'SAFETY' then 'Safety'
          when 'COMMUNICATION' then 'Communication'
          when 'GOOD_EXPERIENCE' then 'Good experience'
          when 'OTHER' then 'Other'
        end
      ) like lower(${input.likePattern}) escape '!'
    group by p."category"
    order by count(*) desc, p."category"
  `
  let [locationResult, landlordResult, categoryResult] = await Promise.all([
    database.exec(locationStatement),
    database.exec(landlordStatement),
    matchesCategory ? database.exec(categoryStatement) : Promise.resolve({ rows: [] }),
  ])
  let locationRows = s.parse(s.array(reportLocationSuggestionRowSchema), locationResult.rows ?? [])
  let landlordRows = s.parse(s.array(reportLandlordSuggestionRowSchema), landlordResult.rows ?? [])
  let categoryRows = s.parse(s.array(reportCategorySuggestionRowSchema), categoryResult.rows ?? [])
  let candidates = new Map<string, RankedReportSuggestion>()

  for (let row of locationRows) {
    let label = normalizeSuggestionText(row.label, 100)
    let context = normalizeSuggestionText(row.context, 100)
    if (label == null) continue
    let description =
      row.kind === "region" ? "Region" : context == null ? "City" : `City · ${context}`

    addSuggestion(candidates, {
      kind: row.kind,
      label,
      description,
      value: label,
      total: row.total,
    })
  }

  for (let row of landlordRows) {
    let landlordName = normalizeSuggestionText(row.landlordName, 160)
    if (landlordName == null) continue

    addSuggestion(candidates, {
      kind: "landlord",
      label: landlordName,
      description: "Landlord or manager",
      value: landlordName,
      total: row.total,
    })
  }

  for (let row of categoryRows) {
    let label = REPORT_CATEGORY_LABELS[row.category]
    if (!label.toLowerCase().includes(normalizedQuery)) continue

    addSuggestion(candidates, {
      kind: "category",
      label,
      description: "Report category",
      value: label,
      total: row.total,
    })
  }

  return [...candidates.values()]
    .sort((left, right) => compareSuggestions(left, right, normalizedQuery))
    .slice(0, REPORT_SUGGESTION_LIMIT)
    .map(({ total: _total, ...suggestion }) => suggestion)
}

interface RankedReportSuggestion extends ReportSuggestion {
  total: number
}

const REPORT_SUGGESTION_KIND_PRIORITY = {
  city: 0,
  region: 1,
  landlord: 2,
  category: 3,
} as const satisfies Record<ReportSuggestionKind, number>

function addSuggestion(
  suggestions: Map<string, RankedReportSuggestion>,
  suggestion: RankedReportSuggestion,
): void {
  let key = `${suggestion.kind}:${suggestion.value.toLowerCase()}`
  let existing = suggestions.get(key)

  if (existing == null) {
    suggestions.set(key, suggestion)
    return
  }

  existing.total += suggestion.total
  if (existing.description !== suggestion.description) existing.description = "City"
}

function compareSuggestions(
  left: RankedReportSuggestion,
  right: RankedReportSuggestion,
  query: string,
): number {
  let matchDifference =
    getSuggestionMatchRank(left.label, query) - getSuggestionMatchRank(right.label, query)
  if (matchDifference !== 0) return matchDifference

  let countDifference = right.total - left.total
  if (countDifference !== 0) return countDifference

  let kindDifference =
    REPORT_SUGGESTION_KIND_PRIORITY[left.kind] - REPORT_SUGGESTION_KIND_PRIORITY[right.kind]
  if (kindDifference !== 0) return kindDifference

  return left.label.toLowerCase().localeCompare(right.label.toLowerCase())
}

function getSuggestionMatchRank(label: string, query: string): number {
  let normalizedLabel = label.toLowerCase()
  if (normalizedLabel === query) return 0
  return normalizedLabel.startsWith(query) ? 1 : 2
}

function normalizeSuggestionText(value: string | null, maxLength: number): string | null {
  let normalized = value?.trim().slice(0, maxLength) ?? ""
  return normalized.length === 0 ? null : normalized
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
