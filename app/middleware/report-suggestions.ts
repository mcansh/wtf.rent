import type { Middleware } from "remix/router"
import { createContextKey } from "remix/router"

import type {
  ReportSuggestionService,
  ReportSuggestionServiceOptions,
} from "../actions/home-page/suggestions.ts"
import { createReportSuggestionService } from "../actions/home-page/suggestions.ts"

export const ReportSuggestions = createContextKey<ReportSuggestionService>()
export const PhotonFetch = createContextKey<typeof globalThis.fetch>()

export function loadReportSuggestions(
  options: ReportSuggestionServiceOptions = {},
): Middleware<
  | { key: typeof ReportSuggestions; value: ReportSuggestionService }
  | { key: typeof PhotonFetch; value: typeof globalThis.fetch }
> {
  let photonFetch = options.photonFetch ?? globalThis.fetch
  let service = createReportSuggestionService(options)

  return (context, next) => {
    context.set(PhotonFetch, photonFetch)
    context.set(ReportSuggestions, service)
    return next()
  }
}
