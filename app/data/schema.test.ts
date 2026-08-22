import * as assert from "remix/assert"
import { tableMetadataKey } from "remix/data-table"
import type { AnyTable } from "remix/data-table"
import { describe, it } from "remix/test"

import {
  commentAuthor,
  commentPost,
  comments,
  postAuthor,
  postComments,
  posts,
  REPORT_CATEGORIES,
  REPORT_STATUSES,
  userComments,
  userPosts,
  users,
} from "./schema.ts"

function readTableMetadata<table extends AnyTable>(table: table): table[typeof tableMetadataKey] {
  let metadataKey = Object.getOwnPropertySymbols(table).find(
    (key) => key.description === tableMetadataKey.description,
  )
  if (metadataKey === undefined) {
    assert.fail("Expected table metadata symbol on schema table")
  }

  // SAFETY: The matching own symbol is the table's metadata key from its isolated module instance.
  return table[metadataKey as typeof tableMetadataKey]
}

describe("data schema", () => {
  it("preserves the existing PostgreSQL identifiers and constraints", () => {
    let usersTable = readTableMetadata(users)
    let postsTable = readTableMetadata(posts)
    let commentsTable = readTableMetadata(comments)
    assert.deepEqual(
      [usersTable.name, postsTable.name, commentsTable.name],
      ["User", "Post", "Comment"],
    )
    assert.deepEqual(usersTable.timestamps, {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    })

    let userColumns = usersTable.columnDefinitions
    assert.equal(userColumns.id.primaryKey, true)
    assert.deepEqual(userColumns.createdAt.default, { kind: "now" })
    assert.deepEqual(userColumns.username.unique, { name: "User_username_key" })
    assert.deepEqual(userColumns.email.unique, { name: "User_email_key" })

    let postColumns = postsTable.columnDefinitions
    assert.equal(postColumns.authorId.references?.table.name, "User")
    assert.equal(postColumns.authorId.references?.onDelete, "restrict")

    let commentColumns = commentsTable.columnDefinitions
    assert.equal(commentColumns.authorId.references?.onDelete, "restrict")
    assert.equal(commentColumns.postId.references?.table.name, "Post")
    assert.equal(commentColumns.postId.references?.onDelete, "cascade")
  })

  it("generates string ids before inserts", () => {
    for (let table of [users, posts, comments]) {
      let metadata = readTableMetadata(table)
      let beforeWrite = metadata.beforeWrite
      if (beforeWrite === undefined) {
        assert.fail(`Expected ${metadata.name} to generate ids before writes`)
      }

      let result = beforeWrite({
        operation: "create",
        tableName: metadata.name,
        value: {},
      })

      if (!("value" in result)) {
        assert.fail(`Expected ${metadata.name} id generation to succeed`)
      }
      assert.match(
        String(result.value.id),
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
    }
  })

  it("maps both sides of each relation", () => {
    assert.deepEqual(userPosts.sourceKey, ["id"])
    assert.deepEqual(userPosts.targetKey, ["authorId"])
    assert.deepEqual(userComments.targetKey, ["authorId"])
    assert.deepEqual(postAuthor.sourceKey, ["authorId"])
    assert.deepEqual(postComments.targetKey, ["postId"])
    assert.deepEqual(commentAuthor.sourceKey, ["authorId"])
    assert.deepEqual(commentPost.sourceKey, ["postId"])
  })

  it("describes the legacy-safe report columns and allowed values", () => {
    let postColumns = readTableMetadata(posts).columnDefinitions

    for (let column of [
      "address",
      "city",
      "region",
      "landlordName",
      "category",
      "rating",
      "experienceConfirmedAt",
    ] as const) {
      assert.equal(postColumns[column].nullable, true, column)
    }

    assert.deepEqual(postColumns.category.enumValues, REPORT_CATEGORIES)
    assert.deepEqual(postColumns.status.enumValues, REPORT_STATUSES)
    assert.equal(postColumns.status.nullable, false)
    assert.deepEqual(postColumns.status.default, { kind: "literal", value: "PUBLISHED" })
    assert.deepEqual(postColumns.rating.checks, [
      { expression: '"rating" between 1 and 5', name: "Post_rating_check" },
    ])
  })

  it("does not fabricate structured metadata for legacy writes", () => {
    let postMetadata = readTableMetadata(posts)
    let beforeWrite = postMetadata.beforeWrite
    if (beforeWrite === undefined) assert.fail("Expected Post beforeWrite hook")

    let result = beforeWrite({
      operation: "create",
      tableName: postMetadata.name,
      value: {
        title: "Legacy post",
        content: "Stored before structured reports",
        authorId: "legacy-author",
      },
    })
    if (!("value" in result)) assert.fail("Expected legacy Post write to succeed")

    assert.match(String(result.value.id), /^[0-9a-f-]{36}$/)
    assert.equal("address" in result.value, false)
    assert.equal("category" in result.value, false)
    assert.equal("rating" in result.value, false)
    assert.equal("status" in result.value, false)
  })
})
