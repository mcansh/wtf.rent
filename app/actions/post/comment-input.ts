import * as s from "remix/data-schema"
import { maxLength, minLength } from "remix/data-schema/checks"
import * as f from "remix/data-schema/form-data"

const textValueSchema = s.string()

export const COMMENT_CURSOR_AT_PARAM = "commentsBeforeAt"
export const COMMENT_CURSOR_ID_PARAM = "commentsBeforeId"

const commentInputSchema = f.object({
  content: f.field(
    s
      .string()
      .transform((value) => value.trim())
      .pipe(minLength(1), maxLength(1_000)),
  ),
})

export type CommentInput = s.InferOutput<typeof commentInputSchema>

export function parseCommentInput(formData: FormData) {
  return s.parseSafe(commentInputSchema, formData)
}

export function getSafeCommentValue(formData: FormData): string {
  let parsed = s.parseSafe(textValueSchema, formData.get("content"))
  return parsed.success ? parsed.value.trim().slice(0, 1_000) : ""
}

export function parseCommentCursor(searchParams: URLSearchParams) {
  let createdAtValue = searchParams.get(COMMENT_CURSOR_AT_PARAM)
  let id = searchParams.get(COMMENT_CURSOR_ID_PARAM)
  if (createdAtValue == null || id == null || id.length === 0 || id.length > 100) return null

  let createdAt = new Date(createdAtValue)
  if (Number.isNaN(createdAt.getTime()) || createdAt.toISOString() !== createdAtValue) return null

  return { createdAt, id }
}
