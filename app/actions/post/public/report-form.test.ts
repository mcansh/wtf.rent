import { describe, it } from "node:test"

import * as assert from "remix/assert"

import { createReportSubmissionState } from "./report-form.tsx"

describe("report submission state", () => {
  it("starts once and rejects repeat submissions", () => {
    let updates = 0
    let submission = createReportSubmissionState(() => updates++)

    assert.equal(submission.started, false)
    assert.equal(submission.begin(), true)
    assert.equal(submission.started, true)
    assert.equal(submission.begin(), false)
    assert.equal(updates, 1)
  })
})
