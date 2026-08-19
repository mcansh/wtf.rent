import { describe, it } from "node:test"

import * as assert from "remix/assert"
import {
  getTableBeforeWrite,
  getTableColumnDefinitions,
  getTableName,
  getTableTimestamps,
} from "remix/data-table"

import {
  commentAuthor,
  commentPost,
  comments,
  postAuthor,
  postComments,
  posts,
  userComments,
  userPosts,
  users,
} from "./schema.ts"

describe("data schema", () => {
  it("preserves the existing PostgreSQL identifiers and constraints", () => {
    assert.deepEqual([users, posts, comments].map(getTableName), ["User", "Post", "Comment"])
    assert.deepEqual(getTableTimestamps(users), {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    })

    let userColumns = getTableColumnDefinitions(users)
    assert.equal(userColumns.id.primaryKey, true)
    assert.deepEqual(userColumns.createdAt.default, { kind: "now" })
    assert.deepEqual(userColumns.username.unique, { name: "User_username_key" })
    assert.deepEqual(userColumns.email.unique, { name: "User_email_key" })

    let postColumns = getTableColumnDefinitions(posts)
    assert.equal(postColumns.authorId.references?.table.name, "User")
    assert.equal(postColumns.authorId.references?.onDelete, "restrict")

    let commentColumns = getTableColumnDefinitions(comments)
    assert.equal(commentColumns.authorId.references?.onDelete, "restrict")
    assert.equal(commentColumns.postId.references?.table.name, "Post")
    assert.equal(commentColumns.postId.references?.onDelete, "cascade")
  })

  it("generates string ids before inserts", () => {
    for (let table of [users, posts, comments]) {
      let beforeWrite = getTableBeforeWrite(table)
      if (beforeWrite === undefined) {
        assert.fail(`Expected ${getTableName(table)} to generate ids before writes`)
      }

      let result = beforeWrite({
        operation: "create",
        tableName: getTableName(table),
        value: {},
      })

      if (!("value" in result)) {
        assert.fail(`Expected ${getTableName(table)} id generation to succeed`)
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
})
