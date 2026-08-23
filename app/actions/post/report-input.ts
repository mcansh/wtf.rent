import * as s from "remix/data-schema"
import { max, maxLength, min, minLength } from "remix/data-schema/checks"
import * as coerce from "remix/data-schema/coerce"
import * as f from "remix/data-schema/form-data"

import { REPORT_CATEGORIES } from "../../data/schema.ts"

const UNIT_DESIGNATOR =
  /\b(?:apartment|apt\.?|unit|suite|ste\.?)(?=\s|#)\s*(?:#\s*)?[A-Za-z0-9-]+\b|#\s*[A-Za-z0-9-]+/i
const textValueSchema = s
  .string()
  .refine((value) => !value.includes("\0"), "NUL characters are not allowed")

export const REPORT_LIKE_ESCAPE_CHARACTER = "!"

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export const REPORT_CATEGORY_LABELS = {
  MAINTENANCE: "Maintenance",
  RENT_INCREASE: "Rent increase",
  FEES_OR_DEPOSIT: "Fees or deposit",
  SAFETY: "Safety",
  COMMUNICATION: "Communication",
  GOOD_EXPERIENCE: "Good experience",
  OTHER: "Other",
} as const satisfies Record<ReportCategory, string>

const trimmedAddress = textValueSchema
  .transform((value) => value.trim())
  .pipe(minLength(5), maxLength(160))
  .refine(
    (value) => !UNIT_DESIGNATOR.test(value),
    "Remove apartment, suite, or unit details from the address",
  )

const optionalLandlord = textValueSchema
  .transform((value) => value.trim())
  .pipe(maxLength(160))
  .refine((value) => value.length === 0 || value.length >= 2, "Expected at least 2 characters")
  .transform((value) => (value.length === 0 ? null : value))

const createReportSchema = f.object({
  address: f.field(trimmedAddress),
  city: f.field(
    textValueSchema.transform((value) => value.trim()).pipe(minLength(1), maxLength(100)),
  ),
  region: f.field(
    textValueSchema.transform((value) => value.trim()).pipe(minLength(1), maxLength(100)),
  ),
  landlordName: f.field(optionalLandlord),
  category: f.field(s.enum_(REPORT_CATEGORIES)),
  rating: f.field(
    coerce.number().refine(Number.isInteger, "Expected a whole-number rating").pipe(min(1), max(5)),
  ),
  title: f.field(
    textValueSchema.transform((value) => value.trim()).pipe(minLength(5), maxLength(120)),
  ),
  content: f.field(
    textValueSchema.transform((value) => value.trim()).pipe(minLength(20), maxLength(5_000)),
  ),
  isFirsthand: f.field(
    s
      .defaulted(s.string(), "")
      .refine(
        (value) => value === "on",
        "Confirm this is your firsthand experience and contains no private unit details",
      )
      .transform(() => true as const),
  ),
})

const reportFeedSchema = f.object({
  q: f.field(
    s
      .defaulted(textValueSchema, "")
      .transform((value) => value.trim())
      .transform((value) => value.slice(0, 100)),
  ),
  page: f.field(s.defaulted(s.string(), "").transform(normalizePage)),
  radius: f.field(s.defaulted(s.string(), "").transform(normalizeRadius)),
  lat: f.field(s.defaulted(s.string(), "").transform(normalizeLatitude)),
  lng: f.field(s.defaulted(s.string(), "").transform(normalizeLongitude)),
})

export type CreateReportInput = s.InferOutput<typeof createReportSchema>
export type UpdateReportInput = CreateReportInput

export interface ReportFormValues {
  address: string
  category: ReportCategory | ""
  city: string
  content: string
  isFirsthand: boolean
  landlordName: string
  rating: "" | "1" | "2" | "3" | "4" | "5"
  region: string
  title: string
}

export interface ReportFeedInput {
  likePattern: string | null
  lat: number | null
  lng: number | null
  page: number
  q: string
  radius: number | null
}

export const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const
export type RadiusOption = (typeof RADIUS_OPTIONS)[number]

export function parseCreateReportInput(formData: FormData) {
  return s.parseSafe(createReportSchema, formData)
}

export function parseUpdateReportInput(formData: FormData) {
  return s.parseSafe(createReportSchema, formData)
}

export function getSafeReportValues(formData: FormData): ReportFormValues {
  let category = getBoundedText(formData, "category", 40)
  let rating = getBoundedText(formData, "rating", 1)

  return {
    address: getBoundedText(formData, "address", 160),
    city: getBoundedText(formData, "city", 100),
    region: getBoundedText(formData, "region", 100),
    landlordName: getBoundedText(formData, "landlordName", 160),
    category: isReportCategory(category) ? category : "",
    rating: isReportRating(rating) ? rating : "",
    title: getBoundedText(formData, "title", 120),
    content: getBoundedText(formData, "content", 5_000),
    isFirsthand: formData.get("isFirsthand") === "on",
  }
}

export function parseReportFeedInput(searchParams: URLSearchParams) {
  let parsed = s.parseSafe(reportFeedSchema, searchParams)
  if (!parsed.success) return parsed

  let { q, page, radius, lat, lng } = parsed.value

  return {
    success: true as const,
    value: {
      q,
      page,
      radius,
      lat,
      lng,
      likePattern: q.length === 0 ? null : toLiteralLikePattern(q),
    } satisfies ReportFeedInput,
  }
}

function normalizePage(value: string): number {
  let normalized = value.trim()
  if (!/^[1-9]\d*$/.test(normalized)) return 1

  let page = Number(normalized)
  return Number.isSafeInteger(page) ? page : 1
}

function normalizeRadius(value: string): number | null {
  let trimmed = value.trim()
  if (trimmed === "") return null
  let n = Number(trimmed)
  return (RADIUS_OPTIONS as readonly number[]).includes(n) ? n : null
}

function normalizeLatitude(value: string): number | null {
  let trimmed = value.trim()
  if (trimmed === "") return null
  let n = Number(trimmed)
  return Number.isFinite(n) && n >= -90 && n <= 90 ? n : null
}

function normalizeLongitude(value: string): number | null {
  let trimmed = value.trim()
  if (trimmed === "") return null
  let n = Number(trimmed)
  return Number.isFinite(n) && n >= -180 && n <= 180 ? n : null
}

function toLiteralLikePattern(value: string): string {
  let escaped = value
    .replaceAll(REPORT_LIKE_ESCAPE_CHARACTER, REPORT_LIKE_ESCAPE_CHARACTER.repeat(2))
    .replaceAll("%", `${REPORT_LIKE_ESCAPE_CHARACTER}%`)
    .replaceAll("_", `${REPORT_LIKE_ESCAPE_CHARACTER}_`)

  return `%${escaped}%`
}

function getBoundedText(formData: FormData, name: string, maxLength: number): string {
  let parsed = s.parseSafe(textValueSchema, formData.get(name))
  return parsed.success ? parsed.value.trim().slice(0, maxLength) : ""
}

function isReportCategory(value: string): value is ReportCategory {
  return REPORT_CATEGORIES.some((category) => category === value)
}

function isReportRating(value: string): value is ReportFormValues["rating"] {
  return /^[1-5]$/.test(value)
}
