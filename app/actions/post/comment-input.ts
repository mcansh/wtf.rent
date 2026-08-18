import * as s from "remix/data-schema"
import { maxLength, minLength } from "remix/data-schema/checks"
import * as f from "remix/data-schema/form-data"

const textValueSchema = s.string()

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
