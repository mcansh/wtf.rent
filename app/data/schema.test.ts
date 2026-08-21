import * as assert from "remix/assert"
import type { AnyTable, TableBeforeWrite } from "remix/data-table"
import { describe, it } from "remix/test"

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

const TABLE_METADATA_KEY_DESCRIPTION = "data-table.tableMetadata"

type ColumnDefinitionLike = {
  primaryKey?: boolean
  default?: unknown
  unique?: { name: string }
  references?: {
    table: { name: string }
    onDelete?: string
  }
}

function readTableMetadata(table: AnyTable) {
  let metadataKey = Reflect.ownKeys(table).find(
    (key) => typeof key === "symbol" && key.description === TABLE_METADATA_KEY_DESCRIPTION,
  )
  if (metadataKey === undefined) {
    assert.fail("Expected table metadata symbol on schema table")
  }

  return Reflect.get(table, metadataKey) as {
    name: string
    timestamps: Record<string, string> | undefined
    columnDefinitions: Record<string, ColumnDefinitionLike>
    beforeWrite: TableBeforeWrite<Record<string, unknown>> | undefined
  }
}

describe("data schema", () => {
  it("preserves the existing PostgreSQL identifiers and constraints", () => {
    let [usersTable, postsTable, commentsTable] = [users, posts, comments].map(readTableMetadata)
    assert.deepEqual([usersTable.name, postsTable.name, commentsTable.name], ["User", "Post", "Comment"])
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
})
