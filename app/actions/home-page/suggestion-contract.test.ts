import { describe, it } from "node:test"

import * as assert from "remix/assert"
import * as s from "remix/data-schema"

import { reportSuggestionResponseSchema } from "./public/suggestion-contract.ts"

describe("report suggestion response", () => {
  it("accepts the public autocomplete contract", () => {
    let parsed = s.parseSafe(reportSuggestionResponseSchema, {
      suggestions: [
        {
          kind: "city",
          label: "Detroit",
          description: "City · MI",
          value: "Detroit",
        },
      ],
    })

    assert.equal(parsed.success, true)
  })

  it("rejects unknown kinds and unbounded labels", () => {
    for (let suggestion of [
      { kind: "address", label: "Detroit", description: "City", value: "Detroit" },
      { kind: "city", label: "", description: "City", value: "Detroit" },
      { kind: "city", label: "x".repeat(161), description: "City", value: "Detroit" },
    ]) {
      assert.equal(
        s.parseSafe(reportSuggestionResponseSchema, { suggestions: [suggestion] }).success,
        false,
      )
    }
  })

  it("rejects responses over the public result limit", () => {
    let suggestion = {
      kind: "city",
      label: "Detroit",
      description: "City · MI",
      value: "Detroit",
    }

    assert.equal(
      s.parseSafe(reportSuggestionResponseSchema, { suggestions: Array(9).fill(suggestion) })
        .success,
      false,
    )
  })
})
