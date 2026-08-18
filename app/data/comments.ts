import * as s from "remix/data-schema"
import type { Database } from "remix/data-table"
import { sql } from "remix/data-table"

import type { Comment, Post, User } from "./schema.ts"
import { comments, posts } from "./schema.ts"

const publicCommentSchema = s.object({
  id: s.string(),
  content: s.string(),
  createdAt: s.instanceof_(Date),
  username: s.string(),
})

export type PublicComment = s.InferOutput<typeof publicCommentSchema>

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
): Promise<PublicComment[]> {
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
    order by c."createdAt" asc, c."id" asc
  `
  let result = await database.exec(statement)
  return s.parse(s.array(publicCommentSchema), result.rows ?? [])
}
