import type { Middleware } from "remix/router"
import { createContextKey } from "remix/router"

import type {
  ReportSuggestionService,
  ReportSuggestionServiceOptions,
} from "../actions/home-page/suggestions.ts"
import { createReportSuggestionService } from "../actions/home-page/suggestions.ts"

export const ReportSuggestions = createContextKey<ReportSuggestionService>()

export function loadReportSuggestions(
  options: ReportSuggestionServiceOptions = {},
): Middleware<{ key: typeof ReportSuggestions; value: ReportSuggestionService }> {
  let service = createReportSuggestionService(options)

  return (context, next) => {
    context.set(ReportSuggestions, service)
    return next()
  }
}
