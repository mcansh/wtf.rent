import { describe, it } from "node:test"

import * as assert from "remix/assert"

import {
  createReportTestApp,
  seedComment,
  seedReportUser,
  seedStructuredReport,
} from "../../test/reports.ts"
import { createComment, listPublicComments } from "./comments.ts"
import { comments } from "./schema.ts"

describe("createComment", () => {
  it("creates a comment with trusted authorship for a published report", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let reportAuthor = await seedReportUser(app)
    let commenter = await seedReportUser(app, {
      id: "commenter",
      username: "commenter",
      email: "commenter@example.test",
    })
    let report = await seedStructuredReport(app, {
      id: "commented-report",
      authorId: reportAuthor.id,
    })

    let comment = await createComment(app.database, report.id, "This timeline is useful context.", {
      authorId: commenter.id,
    })

    assert.ok(comment)
    assert.equal(comment.content, "This timeline is useful context.")
    assert.equal(comment.authorId, commenter.id)
    assert.equal(comment.postId, report.id)
    assert.equal(comment.createdAt instanceof Date, true)
    assert.deepEqual(await app.database.find(comments, comment.id), comment)
  })

  it("does not create comments for hidden or missing reports", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    let hidden = await seedStructuredReport(app, {
      id: "hidden-comment-target",
      authorId: author.id,
      status: "HIDDEN",
    })

    assert.equal(
      await createComment(app.database, hidden.id, "This must not be stored.", {
        authorId: author.id,
      }),
      null,
    )
    assert.equal(
      await createComment(app.database, "missing-comment-target", "This must not be stored.", {
        authorId: author.id,
      }),
      null,
    )
    assert.deepEqual(await app.database.findMany(comments), [])
  })
})

describe("listPublicComments", () => {
  it("returns an allowlisted, report-scoped list in stable oldest-first order", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let reportAuthor = await seedReportUser(app)
    let commenter = await seedReportUser(app, {
      id: "public-commenter",
      username: "public-<commenter>",
      email: "private-commenter@example.test",
      password: "private-commenter-password",
    })
    let report = await seedStructuredReport(app, {
      id: "public-comment-report",
      authorId: reportAuthor.id,
      address: "515 Private Comment Report Marker",
    })
    let other = await seedStructuredReport(app, {
      id: "other-comment-report",
      authorId: reportAuthor.id,
    })
    let hidden = await seedStructuredReport(app, {
      id: "hidden-comment-report",
      authorId: reportAuthor.id,
      status: "HIDDEN",
    })
    let oldestAt = new Date("2026-08-16T09:00:00.000Z")
    let tiedAt = new Date("2026-08-17T09:00:00.000Z")

    await seedComment(app, {
      id: "oldest",
      authorId: commenter.id,
      postId: report.id,
      content: "The oldest public comment.",
      createdAt: oldestAt,
      updatedAt: oldestAt,
    })
    await seedComment(app, {
      id: "tie-b",
      authorId: commenter.id,
      postId: report.id,
      content: "A tied comment with hostile <script>alert(1)</script> text.",
      createdAt: tiedAt,
      updatedAt: tiedAt,
    })
    await seedComment(app, {
      id: "tie-a",
      authorId: commenter.id,
      postId: report.id,
      content: "The first tied comment.",
      createdAt: tiedAt,
      updatedAt: tiedAt,
    })
    await seedComment(app, {
      id: "other-report-comment",
      authorId: commenter.id,
      postId: other.id,
    })
    await seedComment(app, {
      id: "hidden-report-comment",
      authorId: commenter.id,
      postId: hidden.id,
    })

    let result = await listPublicComments(app.database, report.id)

    assert.deepEqual(
      result.map((comment) => comment.id),
      ["oldest", "tie-a", "tie-b"],
    )
    assert.deepEqual(Object.keys(result[0] ?? {}).sort(), [
      "content",
      "createdAt",
      "id",
      "username",
    ])
    assert.equal(result[0]?.username, "public-<commenter>")
    assert.equal(result[0]?.createdAt.toISOString(), oldestAt.toISOString())
    let serialized = JSON.stringify(result)
    assert.equal(serialized.includes("private-commenter@example.test"), false)
    assert.equal(serialized.includes("private-commenter-password"), false)
    assert.equal(serialized.includes("515 Private Comment Report Marker"), false)
    assert.equal(serialized.includes(reportAuthor.id), false)
    assert.equal(serialized.includes(commenter.id), false)
    assert.equal(serialized.includes(other.id), false)
    assert.equal(serialized.includes(hidden.id), false)
  })

  it("returns nothing for hidden, missing, or hostile report ids", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    let hidden = await seedStructuredReport(app, {
      id: "hidden-list-target",
      authorId: author.id,
      status: "HIDDEN",
    })
    await seedComment(app, {
      id: "hidden-list-comment",
      authorId: author.id,
      postId: hidden.id,
    })

    assert.deepEqual(await listPublicComments(app.database, hidden.id), [])
    assert.deepEqual(await listPublicComments(app.database, "missing-list-target"), [])
    assert.deepEqual(await listPublicComments(app.database, "' or 1 = 1 --"), [])
  })
})
