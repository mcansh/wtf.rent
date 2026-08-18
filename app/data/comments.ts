import * as s from "remix/data-schema"
import type { Database } from "remix/data-table"
import { rawSql, sql } from "remix/data-table"

import type { Comment, Post, User } from "./schema.ts"
import { comments, posts } from "./schema.ts"

const publicCommentSchema = s.object({
  id: s.string(),
  content: s.string(),
  createdAt: s.instanceof_(Date),
  username: s.string(),
})

export type PublicComment = s.InferOutput<typeof publicCommentSchema>

export const PUBLIC_COMMENT_PAGE_SIZE = 50

export interface PublicCommentCursor {
  createdAt: Date
  id: string
}

export interface PublicCommentPage {
  comments: PublicComment[]
  hasOlder: boolean
  isLatest: boolean
  olderCursor: PublicCommentCursor | null
}

export interface CreateCommentTrustedContext {
  authorId: User["id"]
}

export function createComment(
  database: Database,
  reportId: Post["id"],
  content: string,
  trusted: CreateCommentTrustedContext,
): Promise<Comment | null> {
  return database.transaction(async (transaction) => {
    let report = await transaction.findOne(posts, {
      where: { id: reportId, status: "PUBLISHED" },
    })
    if (report == null) return null

    return transaction.create(
      comments,
      {
        content,
        authorId: trusted.authorId,
        postId: report.id,
      },
      { returnRow: true },
    )
  })
}

export async function listPublicComments(
  database: Database,
  reportId: Post["id"],
  cursor: PublicCommentCursor | null = null,
): Promise<PublicCommentPage> {
  let cursorWhere =
    cursor == null
      ? rawSql("", [])
      : rawSql(
          `
            and (
              c."createdAt" < ?
              or (c."createdAt" = ? and c."id" < ?)
            )
          `,
          [cursor.createdAt, cursor.createdAt, cursor.id],
        )
  let statement = sql`
    select
      c."id" as "id",
      c."content" as "content",
      c."createdAt" as "createdAt",
      u."username" as "username"
    from "Comment" c
    inner join "User" u on u."id" = c."authorId"
    inner join "Post" p on p."id" = c."postId"
    where p."id" = ${reportId} and p."status" = ${"PUBLISHED"}
    ${cursorWhere}
    order by c."createdAt" desc, c."id" desc
    limit ${PUBLIC_COMMENT_PAGE_SIZE + 1}
  `
  let result = await database.exec(statement)
  let descending = s.parse(s.array(publicCommentSchema), result.rows ?? [])
  let hasOlder = descending.length > PUBLIC_COMMENT_PAGE_SIZE
  let visibleDescending = descending.slice(0, PUBLIC_COMMENT_PAGE_SIZE)
  let oldestVisible = visibleDescending.at(-1)

  return {
    comments: visibleDescending.toReversed(),
    hasOlder,
    isLatest: cursor == null,
    olderCursor:
      hasOlder && oldestVisible != null
        ? { createdAt: oldestVisible.createdAt, id: oldestVisible.id }
        : null,
  }
}
