import { describe, it } from "node:test"

import * as assert from "remix/assert"

import { parseDirectoryInput } from "./input.ts"

describe("directory input", () => {
  it("normalizes display text and treats LIKE metacharacters as literal input", () => {
    let input = validDirectoryInput(
      new URLSearchParams({ q: "  50%_off! management  ", page: "3" }),
    )

    assert.deepEqual(input, {
      q: "50%_off! management",
      page: 3,
      likePattern: "%50!%!_off!! management%",
    })
  })

  it("caps the query and normalizes invalid pages to one", () => {
    let capped = validDirectoryInput(
      new URLSearchParams({ q: `  ${"q".repeat(150)}  `, page: "24" }),
    )

    assert.equal(capped.q.length, 100)
    assert.equal(capped.likePattern?.length, 102)
    assert.equal(capped.page, 24)

    for (let page of [undefined, "", "0", "-1", "1.5", "abc", "9007199254740992"]) {
      let params = new URLSearchParams()
      if (page !== undefined) params.set("page", page)

      assert.equal(validDirectoryInput(params).page, 1, String(page))
    }
  })

  it("returns no search pattern for an empty query", () => {
    assert.deepEqual(validDirectoryInput(new URLSearchParams()), {
      q: "",
      page: 1,
      likePattern: null,
    })
  })
})

function validDirectoryInput(searchParams: URLSearchParams) {
  let parsed = parseDirectoryInput(searchParams)
  assert.equal(parsed.success, true)
  if (!parsed.success) assert.fail("Expected valid directory input")
  return parsed.value
}
