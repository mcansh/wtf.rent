import { listPublicReportSuggestions } from "../../data/reports.ts"
import { listPhotonLocationSuggestions } from "./photon.ts"
import type { ReportSuggestion } from "./public/suggestion-contract.ts"
import { REPORT_SUGGESTION_LIMIT } from "./public/suggestion-contract.ts"
import type { ReportSuggestionInput } from "./suggestion-input.ts"

const REPORT_SUGGESTION_CACHE_MAX_ENTRIES = 256
const REPORT_SUGGESTION_CACHE_TTL_MS = 60_000

interface ReportSuggestionCacheEntry {
  expiresAt: number
  promise: Promise<ReportSuggestion[]>
}

export interface ReportSuggestionServiceOptions {
  photonFetch?: typeof globalThis.fetch
}

export type ReportSuggestionService = (input: ReportSuggestionInput) => Promise<ReportSuggestion[]>

export function createReportSuggestionService(
  options: ReportSuggestionServiceOptions = {},
): ReportSuggestionService {
  let cache = new Map<string, ReportSuggestionCacheEntry>()
  let photonFetch = options.photonFetch ?? globalThis.fetch

  return async (input) => {
    if (input.likePattern == null) return []

    let key = input.q.toLowerCase()
    let currentTime = Date.now()
    let cached = cache.get(key)
    if (cached != null && cached.expiresAt > currentTime) return cached.promise
    if (cached != null) cache.delete(key)

    let promise = Promise.all([
      listPublicReportSuggestions(input),
      listPhotonLocationSuggestions(input.q, photonFetch),
    ]).then(([reportSuggestions, photonSuggestions]) =>
      mergeReportSuggestions(reportSuggestions, photonSuggestions),
    )
    let entry = { expiresAt: currentTime + REPORT_SUGGESTION_CACHE_TTL_MS, promise }
    cache.set(key, entry)

    if (cache.size > REPORT_SUGGESTION_CACHE_MAX_ENTRIES) {
      let oldestKey = cache.keys().next().value
      if (oldestKey !== undefined) cache.delete(oldestKey)
    }

    try {
      return await promise
    } catch (error) {
      if (cache.get(key) === entry) cache.delete(key)
      throw error
    }
  }
}

export function mergeReportSuggestions(
  reportSuggestions: ReportSuggestion[],
  photonSuggestions: ReportSuggestion[],
): ReportSuggestion[] {
  let merged = new Map<string, ReportSuggestion>()
  let length = Math.max(reportSuggestions.length, photonSuggestions.length)

  for (let index = 0; index < length && merged.size < REPORT_SUGGESTION_LIMIT; index++) {
    addSuggestion(merged, reportSuggestions[index])
    if (merged.size < REPORT_SUGGESTION_LIMIT) addSuggestion(merged, photonSuggestions[index])
  }

  return [...merged.values()]
}

function addSuggestion(
  suggestions: Map<string, ReportSuggestion>,
  suggestion: ReportSuggestion | undefined,
): void {
  if (suggestion == null) return

  let key = `${suggestion.kind}:${suggestion.value.toLowerCase()}`
  if (!suggestions.has(key)) suggestions.set(key, suggestion)
}
