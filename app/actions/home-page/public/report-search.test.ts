import { describe, it } from "node:test"

import * as assert from "remix/assert"

import { getNextSuggestionIndex } from "./report-search.tsx"

describe("report search keyboard navigation", () => {
  it("wraps forward and backward through suggestions", () => {
    assert.equal(getNextSuggestionIndex(-1, 1, 3), 0)
    assert.equal(getNextSuggestionIndex(0, 1, 3), 1)
    assert.equal(getNextSuggestionIndex(2, 1, 3), 0)
    assert.equal(getNextSuggestionIndex(-1, -1, 3), 2)
    assert.equal(getNextSuggestionIndex(0, -1, 3), 2)
    assert.equal(getNextSuggestionIndex(2, -1, 3), 1)
  })

  it("returns no active option for an empty list", () => {
    assert.equal(getNextSuggestionIndex(-1, 1, 0), -1)
    assert.equal(getNextSuggestionIndex(0, -1, 0), -1)
  })
})
