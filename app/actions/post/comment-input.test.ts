import { describe, it } from "node:test"

import * as assert from "remix/assert"

import { getSafeCommentValue, parseCommentCursor, parseCommentInput } from "./comment-input.ts"

describe("comment input", () => {
  it("trims valid plain-text content and ignores protected fields", () => {
    let formData = commentForm("  This detail helped me compare repair timelines.  ")
    formData.set("authorId", "forged-author")
    formData.set("postId", "forged-report")
    formData.set("createdAt", "2000-01-01T00:00:00.000Z")

    let parsed = parseCommentInput(formData)

    assert.equal(parsed.success, true)
    if (!parsed.success) assert.fail("Expected valid comment input")
    assert.deepEqual(parsed.value, {
      content: "This detail helped me compare repair timelines.",
    })
    assert.equal("authorId" in parsed.value, false)
    assert.equal("postId" in parsed.value, false)
    assert.equal("createdAt" in parsed.value, false)
  })

  it("accepts 1 through 1,000 trimmed characters", () => {
    assert.equal(parseCommentInput(commentForm("x")).success, true)
    assert.equal(parseCommentInput(commentForm("x".repeat(1_000))).success, true)

    for (let content of ["", "   ", "x".repeat(1_001)]) {
      let parsed = parseCommentInput(commentForm(content))
      assert.equal(parsed.success, false, String(content.length))
      if (parsed.success) assert.fail("Expected invalid comment length")
      assert.ok(parsed.issues.some((issue) => issue.path?.[0] === "content"))
    }
  })

  it("rejects non-text form values", () => {
    let formData = new FormData()
    formData.set("content", new Blob(["not a string"], { type: "text/plain" }), "comment.txt")

    let parsed = parseCommentInput(formData)

    assert.equal(parsed.success, false)
    if (parsed.success) assert.fail("Expected a file comment to fail")
    assert.ok(parsed.issues.some((issue) => issue.path?.[0] === "content"))
  })

  it("retains only a bounded safe redisplay value", () => {
    let formData = commentForm(`  ${"x".repeat(1_500)}  `)
    assert.equal(getSafeCommentValue(formData), "x".repeat(1_000))

    let fileData = new FormData()
    fileData.set("content", new Blob(["not text"]), "comment.txt")
    assert.equal(getSafeCommentValue(fileData), "")
  })

  it("accepts only complete canonical comment cursors", () => {
    let valid = new URLSearchParams({
      commentsBeforeAt: "2026-08-18T12:34:56.000Z",
      commentsBeforeId: "comment-id",
    })

    assert.deepEqual(parseCommentCursor(valid), {
      createdAt: new Date("2026-08-18T12:34:56.000Z"),
      id: "comment-id",
    })

    let invalidValues: Array<Record<string, string>> = [
      {},
      { commentsBeforeAt: "not-a-date", commentsBeforeId: "comment-id" },
      { commentsBeforeAt: "2026-08-18T12:34:56Z", commentsBeforeId: "comment-id" },
      { commentsBeforeAt: "2026-08-18T12:34:56.000Z", commentsBeforeId: "" },
      { commentsBeforeAt: "2026-08-18T12:34:56.000Z", commentsBeforeId: "x".repeat(101) },
    ]

    for (let values of invalidValues) {
      assert.equal(parseCommentCursor(new URLSearchParams(values)), null)
    }
  })
})

function commentForm(content: string): FormData {
  let formData = new FormData()
  formData.set("content", content)
  return formData
}
