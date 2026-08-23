import { describe, it } from "node:test"

import * as assert from "remix/assert"

import type { ReportSuggestion } from "./public/suggestion-contract.ts"
import { REPORT_SUGGESTION_LIMIT } from "./public/suggestion-contract.ts"
import { mergeReportSuggestions } from "./suggestions.ts"

describe("report suggestion merge", () => {
  it("interleaves local and Photon results while preserving local duplicates", () => {
    let reports: ReportSuggestion[] = [
      { kind: "city", label: "Detroit", description: "City · MI", value: "Detroit" },
      {
        kind: "landlord",
        label: "Detroit Rentals",
        description: "Landlord or manager",
        value: "Detroit Rentals",
      },
    ]
    let photon: ReportSuggestion[] = [
      {
        kind: "city",
        label: "Detroit",
        description: "City · Michigan, United States",
        value: "Detroit",
      },
      {
        kind: "city",
        label: "Detmold",
        description: "City · Germany",
        value: "Detmold",
      },
    ]

    assert.deepEqual(mergeReportSuggestions(reports, photon), [reports[0], reports[1], photon[1]])
  })

  it("limits interleaved results to the configured maximum", () => {
    let reports = Array.from({ length: REPORT_SUGGESTION_LIMIT }, (_, index): ReportSuggestion => ({
      kind: "city",
      label: `Report ${index}`,
      description: "Report-backed city",
      value: `Report ${index}`,
    }))
    let photon = Array.from({ length: REPORT_SUGGESTION_LIMIT }, (_, index): ReportSuggestion => ({
      kind: "city",
      label: `Photon ${index}`,
      description: "Photon city",
      value: `Photon ${index}`,
    }))
    let expected = reports
      .flatMap((report, index) => [report, photon[index]])
      .slice(0, REPORT_SUGGESTION_LIMIT)

    let merged = mergeReportSuggestions(reports, photon)

    assert.equal(merged.length, REPORT_SUGGESTION_LIMIT)
    assert.deepEqual(merged, expected)
  })
})
