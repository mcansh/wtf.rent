import { describe, it } from "node:test"

import * as assert from "remix/assert"

import type { ReportSuggestion } from "./public/suggestion-contract.ts"
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
})
