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
      success: true,
      value: { q: "d", likePattern: null, prefixPattern: null },
    })
    assert.deepEqual(parseReportSuggestionInput(new URLSearchParams({ q: "  de  " })), {
      success: true,
      value: { q: "de", likePattern: "%de%", prefixPattern: "de%" },
    })
  })

  it("caps input and treats LIKE metacharacters as literal text", () => {
    let escaped = parseReportSuggestionInput(new URLSearchParams({ q: "  50%_off!  " }))
    let capped = parseReportSuggestionInput(new URLSearchParams({ q: `  ${"q".repeat(150)}  ` }))

    assert.deepEqual(escaped, {
      success: true,
      value: {
        q: "50%_off!",
        likePattern: "%50!%!_off!!%",
        prefixPattern: "50!%!_off!!%",
      },
    })
    assert.equal(capped.success, true)
    if (!capped.success) assert.fail("Expected valid suggestion input")
    assert.equal(capped.value.q.length, 100)
    assert.equal(capped.value.likePattern?.length, 102)
    assert.equal(capped.value.prefixPattern?.length, 101)
  })

  it("rejects NUL before the query reaches SQL or Photon", () => {
    let parsed = parseReportSuggestionInput(new URLSearchParams({ q: "Detroit\0" }))

    assert.equal(parsed.success, false)
  })
})
