import { parseReportFeedInput } from "../post/report-input.ts"
import { REPORT_SUGGESTION_QUERY_MIN_LENGTH } from "./public/suggestion-contract.ts"

export { REPORT_SUGGESTION_QUERY_MIN_LENGTH } from "./public/suggestion-contract.ts"

export interface ReportSuggestionInput {
  likePattern: string | null
  prefixPattern: string | null
  q: string
}

export function parseReportSuggestionInput(searchParams: URLSearchParams) {
  let parsed = parseReportFeedInput(searchParams)
  if (!parsed.success) return parsed

  let { likePattern, q } = parsed.value
  let meetsMinimum = q.length >= REPORT_SUGGESTION_QUERY_MIN_LENGTH

  return {
    success: true as const,
    value: {
      q,
      likePattern: meetsMinimum ? likePattern : null,
      prefixPattern: meetsMinimum && likePattern != null ? likePattern.slice(1) : null,
    } satisfies ReportSuggestionInput,
  }
}
