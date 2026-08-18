import type { Issue } from "remix/data-schema"
import type { Handle } from "remix/ui"

import type { PublicCommentCursor, PublicCommentPage } from "../../data/comments.ts"
import type { Post } from "../../data/schema.ts"
import { routes } from "../../routes.ts"
import { COMMENT_CURSOR_AT_PARAM, COMMENT_CURSOR_ID_PARAM } from "./comment-input.ts"

export interface CommentFormState {
  csrfToken: string
  issues?: ReadonlyArray<Issue>
  value?: string
}

interface ReportCommentsProps {
  commentPage: PublicCommentPage
  form: CommentFormState | null
  reportId: Post["id"]
}

export function ReportComments(handle: Handle<ReportCommentsProps>) {
  return () => {
    let { commentPage, form, reportId } = handle.props
    let comments = commentPage.comments

    return (
      <section
        id="comments"
        className="border-ink-950 bg-coral-50 border-t-2"
        aria-labelledby="comments-heading"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,7fr)_minmax(17rem,3fr)] lg:items-start lg:gap-12 lg:py-18">
          <div className="grid min-w-0 gap-6">
            <header className="grid gap-2">
              <p className="font-mono text-xs font-medium tracking-wide uppercase">
                Renter conversation
              </p>
              <h2
                id="comments-heading"
                className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Comments
              </h2>
              <p className="text-base/7 text-pretty sm:text-sm/6">
                {getCommentPageLabel(commentPage)}
              </p>
            </header>

            {comments.length === 0 ? (
              <div className="border-ink-950 bg-paper-50 grid gap-2 border-[1.5px] p-5 sm:p-6">
                <p className="font-semibold">No comments yet.</p>
                <p className="text-base/7 text-pretty sm:text-sm/6">
                  {commentPage.isLatest
                    ? "Add useful context or ask a focused question about this report."
                    : "There are no comments older than this point."}
                </p>
              </div>
            ) : (
              <ol className="border-ink-950 divide-ink-950/20 border-y-2">
                {comments.map((comment) => (
                  <li key={comment.id} className="grid gap-3 py-5 sm:py-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <strong className="break-words">@{comment.username}</strong>
                      <CommentDate value={comment.createdAt} />
                    </div>
                    <p className="text-base/7 break-words whitespace-pre-wrap sm:text-sm/6">
                      {comment.content}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            {commentPage.hasOlder || !commentPage.isLatest ? (
              <nav
                className="flex flex-wrap items-center justify-between gap-3"
                aria-label="Comment pages"
              >
                {!commentPage.isLatest ? (
                  <a
                    className="focus-visible:outline-ink-950 text-base font-semibold underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 sm:text-sm"
                    href={`${routes.post.show.href({ id: reportId })}#comments`}
                  >
                    Back to latest comments
                  </a>
                ) : (
                  <span />
                )}
                {commentPage.olderCursor == null ? null : (
                  <a
                    className="focus-visible:outline-ink-950 text-base font-semibold underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 sm:text-sm"
                    href={getOlderCommentsHref(reportId, commentPage.olderCursor)}
                  >
                    Older comments
                  </a>
                )}
              </nav>
            ) : null}
          </div>

          {form == null ? (
            <aside className="border-ink-950 shadow-ink-950 bg-acid-100 grid gap-4 border-2 p-5 shadow-[6px_6px_0_var(--color-ink-950)] sm:p-6">
              <h3 className="font-serif text-2xl font-semibold tracking-tight">
                Join the conversation
              </h3>
              <p className="text-base/7 text-pretty sm:text-sm/6">
                Sign in to add context or ask a focused question. Your public username appears with
                your comment.
              </p>
              <a
                className="border-ink-950 bg-paper-50 focus-visible:outline-ink-950 w-fit border-[1.5px] px-4 py-2.5 text-base font-semibold shadow-[3px_3px_0_var(--color-ink-950)] hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-3 sm:py-2 sm:text-sm"
                href={routes.login.index.href(undefined, {
                  searchParams: { returnTo: routes.post.show.href({ id: reportId }) },
                })}
              >
                Sign in to comment
              </a>
            </aside>
          ) : (
            <CommentForm form={form} reportId={reportId} />
          )}
        </div>
      </section>
    )
  }
}

function getCommentPageLabel(page: PublicCommentPage): string {
  if (!page.isLatest) return "Showing older public comments"
  if (page.hasOlder) return `Showing the latest ${page.comments.length} public comments`
  return page.comments.length === 1 ? "1 public comment" : `${page.comments.length} public comments`
}

function getOlderCommentsHref(reportId: Post["id"], cursor: PublicCommentCursor): string {
  let href = routes.post.show.href(
    { id: reportId },
    {
      searchParams: {
        [COMMENT_CURSOR_AT_PARAM]: cursor.createdAt.toISOString(),
        [COMMENT_CURSOR_ID_PARAM]: cursor.id,
      },
    },
  )

  return `${href}#comments`
}

function CommentForm(handle: Handle<{ form: CommentFormState; reportId: Post["id"] }>) {
  return () => {
    let errors =
      handle.props.form.issues
        ?.filter((issue) => issue.path?.[0] === "content")
        .map((issue) => issue.message) ?? []
    let hasErrors = errors.length > 0

    return (
      <form
        className="border-ink-950 shadow-ink-950 bg-paper-50 grid gap-5 border-2 p-5 shadow-[6px_6px_0_var(--color-ink-950)] sm:p-6"
        method="post"
        action={routes.post.comment.href({ id: handle.props.reportId })}
        rmx-document
      >
        <input type="hidden" name="_csrf" value={handle.props.form.csrfToken} />
        <div className="grid gap-1">
          <p className="font-mono text-xs font-medium tracking-wide uppercase">Add context</p>
          <h3 className="font-serif text-2xl font-semibold tracking-tight">Leave a comment</h3>
        </div>

        {hasErrors ? (
          <div
            className="border-coral-700 bg-coral-50 grid gap-1 border-l-4 px-4 py-3"
            role="alert"
          >
            <p className="font-semibold">We couldn’t post this comment yet.</p>
            <p className="text-base/7 text-pretty sm:text-sm/6">
              Review the highlighted field and try again.
            </p>
          </div>
        ) : null}

        <div className="grid gap-2">
          <label className="text-base font-semibold sm:text-sm" htmlFor="comment-content">
            Add a comment
          </label>
          <p id="comment-content-help" className="text-base/7 text-pretty sm:text-sm/6">
            Share relevant context in 1–1,000 characters. Keep private contact and unit details out.
          </p>
          <textarea
            id="comment-content"
            className="border-ink-950 bg-paper-50 focus-visible:bg-acid-50 focus-visible:outline-ink-950 aria-[invalid=true]:border-coral-600 aria-[invalid=true]:bg-coral-50 min-h-36 w-full resize-y border-[1.5px] px-3 py-3 text-base outline-none focus-visible:outline-2 focus-visible:-outline-offset-1 sm:py-2.5 sm:text-sm"
            name="content"
            defaultValue={handle.props.form.value ?? ""}
            minLength={1}
            maxLength={1_000}
            aria-describedby={
              hasErrors ? "comment-content-help comment-content-error" : "comment-content-help"
            }
            aria-invalid={hasErrors ? "true" : undefined}
            required
          />
          {hasErrors ? (
            <ul
              id="comment-content-error"
              className="text-coral-700 grid gap-1 text-base font-semibold sm:text-sm"
            >
              {errors.map((error, index) => (
                <li key={`${index}:${error}`}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          className="border-ink-950 bg-acid-100 hover:bg-acid-200 focus-visible:outline-ink-950 w-fit border-[1.5px] px-4 py-2.5 text-base font-semibold shadow-[3px_3px_0_var(--color-ink-950)] focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-3 sm:py-2 sm:text-sm"
          type="submit"
        >
          Post comment
        </button>
      </form>
    )
  }
}

function CommentDate(handle: Handle<{ value: Date }>) {
  return () => (
    <time className="font-mono text-xs" dateTime={handle.props.value.toISOString()}>
      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
        handle.props.value,
      )}
    </time>
  )
}
