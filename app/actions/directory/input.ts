import type { ReportFeedInput } from "../post/report-input.ts"
import { parseReportFeedInput } from "../post/report-input.ts"

export type DirectoryInput = ReportFeedInput

export function parseDirectoryInput(searchParams: URLSearchParams): DirectoryInput {
  return parseReportFeedInput(searchParams)
}
