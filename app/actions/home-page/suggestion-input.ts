import { parseReportFeedInput } from "../post/report-input.ts"
import { REPORT_SUGGESTION_QUERY_MIN_LENGTH } from "./public/suggestion-contract.ts"

export { REPORT_SUGGESTION_QUERY_MIN_LENGTH } from "./public/suggestion-contract.ts"

export interface ReportSuggestionInput {
  likePattern: string | null
  q: string
}

export function parseReportSuggestionInput(searchParams: URLSearchParams): ReportSuggestionInput {
  let { likePattern, q } = parseReportFeedInput(searchParams)

  return {
    q,
    likePattern: q.length >= REPORT_SUGGESTION_QUERY_MIN_LENGTH ? likePattern : null,
  }
}
