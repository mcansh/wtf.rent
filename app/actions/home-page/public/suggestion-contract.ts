import * as s from "remix/data-schema"
import { maxLength, minLength } from "remix/data-schema/checks"

export const REPORT_SUGGESTION_KINDS = ["city", "region", "landlord", "category"] as const
export const REPORT_SUGGESTION_LIMIT = 8
export const REPORT_SUGGESTION_QUERY_MIN_LENGTH = 2

const reportSuggestionSchema = s.object({
  kind: s.enum_(REPORT_SUGGESTION_KINDS),
  label: s.string().pipe(minLength(1), maxLength(160)),
  description: s.string().pipe(minLength(1), maxLength(160)),
  value: s.string().pipe(minLength(1), maxLength(160)),
})

export const reportSuggestionResponseSchema = s.object({
  suggestions: s
    .array(reportSuggestionSchema)
    .refine(
      (suggestions) => suggestions.length <= REPORT_SUGGESTION_LIMIT,
      `Expected at most ${REPORT_SUGGESTION_LIMIT} suggestions`,
    ),
})

export type ReportSuggestion = s.InferOutput<typeof reportSuggestionSchema>
export type ReportSuggestionKind = (typeof REPORT_SUGGESTION_KINDS)[number]
