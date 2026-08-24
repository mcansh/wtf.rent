import type { ReportFeedInput } from "../post/report-input.ts"
import { parseReportFeedInput } from "../post/report-input.ts"

export type DirectoryInput = Pick<ReportFeedInput, "likePattern" | "page" | "q">

export function parseDirectoryInput(searchParams: URLSearchParams) {
  let parsed = parseReportFeedInput(searchParams)
  if (!parsed.success) return parsed

  let { likePattern, page, q } = parsed.value
  return {
    success: true as const,
    value: { likePattern, page, q } satisfies DirectoryInput,
  }
}
