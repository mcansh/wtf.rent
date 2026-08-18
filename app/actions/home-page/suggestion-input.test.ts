import { describe, it } from "node:test"

import * as assert from "remix/assert"

import {
  parseReportSuggestionInput,
  REPORT_SUGGESTION_QUERY_MIN_LENGTH,
} from "./suggestion-input.ts"

describe("report suggestion input", () => {
  it("requires two trimmed characters before querying", () => {
    assert.equal(REPORT_SUGGESTION_QUERY_MIN_LENGTH, 2)
    assert.deepEqual(parseReportSuggestionInput(new URLSearchParams({ q: "  d  " })), {
      q: "d",
      likePattern: null,
    })
    assert.deepEqual(parseReportSuggestionInput(new URLSearchParams({ q: "  de  " })), {
      q: "de",
      likePattern: "%de%",
    })
  })

  it("caps input and treats LIKE metacharacters as literal text", () => {
    let escaped = parseReportSuggestionInput(new URLSearchParams({ q: "  50%_off!  " }))
    let capped = parseReportSuggestionInput(new URLSearchParams({ q: `  ${"q".repeat(150)}  ` }))

    assert.deepEqual(escaped, { q: "50%_off!", likePattern: "%50!%!_off!!%" })
    assert.equal(capped.q.length, 100)
    assert.equal(capped.likePattern?.length, 102)
  })
})
