# Spec: Report Comments

Module id: `report-comments`

## Objective

Make report detail pages conversational without adding replies or moderation workflows. Anyone can
read plain-text comments on a published report. An authenticated user can add a 1–1,000 character
comment with CSRF protection; authorship and timestamps come only from trusted server context.

## Tech Stack

- Existing Node.js, TypeScript, Remix 3, PostgreSQL, and `remix/data-table` stack
- Existing `Comment` table and its user/report foreign keys
- Existing session authentication, CSRF middleware, and report-detail page
- Server-rendered forms and Tailwind CSS; no new dependency
- One additive comment-feed index migration; no column or relationship change

## Commands

- Focused tests: `pnpm test -- app/actions/post/controller.test.tsx app/data/comments.test.ts app/actions/post/comment-input.test.ts`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Lint check: `pnpm exec oxlint .`
- Format check: `pnpm exec oxfmt --check .`
- Route validation: `pnpm exec remix routes`

## Project Structure

- `app/routes.ts` — `POST /posts/:id/comments` nested report mutation
- `app/actions/post/controller.tsx` — authenticated comment action and shared detail rendering
- `app/actions/post/report-detail.tsx` — public comment list, empty state, form, and login prompt
- `app/actions/post/comment-input.ts` — comment form validation and bounded redisplay value
- `app/data/comments.ts` — cursor-bounded public pages and trusted create operations
- `db/migrations/20260818184000_add_comment_feed_index/up.sql` — stable comment-feed index
- `test/reports.ts` — isolated SQLite fixtures for users, reports, comments, sessions, and CSRF
- Colocated tests — validation, data, HTTP, authorization, privacy, and escaping coverage

## Code Style

Validate once at the route boundary and derive protected fields from server context:

```tsx
let parsed = parseCommentInput(context.formData)
if (!parsed.success) {
  return renderReportDetail(context, report, {
    commentIssues: parsed.issues,
    commentValue: getSafeCommentValue(context.formData),
    status: 422,
  })
}

await createComment(context.db, report.id, getCurrentUser().id, parsed.value.content)
return redirect(routes.post.show.href({ id: report.id }), 303)
```

- Keep comment persistence in `app/data/` and response assembly in `app/actions/`.
- Return explicit responses for validation, not-found, and success paths.
- Render comment content through escaped JSX text only.
- Read at most 50 comments per request, with creation time and id as the stable cursor/order.
- Show the latest page by default and render each fetched page oldest first for reading.

## Route and Data Contract

### Public detail: `GET /posts/:id`

- Keeps the existing published-report privacy and `404` behavior.
- Lists only comments attached to that published report.
- Shows at most the latest 50 comments initially and offers an indexed cursor link to older pages.
- Displays comment content, public username, and creation date; never user ids, email, password, or
  the report's stored street address.
- Shows a meaningful empty state when there are no comments.
- Shows the comment form to authenticated users and a safe login link to guests.

### Create comment: `POST /posts/:id/comments`

- Requires authentication and a valid synchronizer CSRF token.
- Accepts one `content` field, trims it, and requires 1–1,000 characters.
- Derives comment id, author id, report id, and timestamps on the server; submitted protected fields
  are ignored.
- Creates comments only for an existing `PUBLISHED` report.
- Returns the standard `404` for a hidden or missing report after authentication.
- Returns an accessible `422` detail page with a bounded escaped value when validation fails.
- Redirects to the report detail with `303` after success.
- Is unsafe to retry: each repeated valid submission intentionally creates another comment.

## Threat Model

- Spoofing/elevation: require authentication and derive author id from the session.
- Tampering/CSRF: validate the report id through an owner-independent public lookup and enforce the
  existing synchronizer token on every write.
- XSS: accept bounded plain text and render only escaped JSX.
- Information disclosure: use an allowlisted comment projection containing only id, content,
  creation date, and public username; filter through a published report join.
- Denial/abuse: cap content at 1,000 characters; cap each read/render at 50 rows; and support the
  stable report/time/id order with an index. Rate limiting, flagging, moderation, and deletion
  remain explicitly deferred and broad launch remains subject to the existing moderation boundary.

## Testing Strategy

- Validation tests cover trimming, blank input, maximum length, non-string input, and bounded safe
  redisplay values.
- Data tests cover cursor bounds, stable ordering, report isolation, hidden-report exclusion,
  protected-field derivation, output allowlisting, and the supporting index migration.
- Controller tests cover guest visibility/login prompt, guest mutation redirect, CSRF rejection,
  hidden/missing `404`, linked `422` errors, escaped redisplay, cursor navigation, successful `303`,
  and forged fields.
- Browser verification covers native no-JavaScript submission, keyboard labels/focus, empty and
  populated states, responsive layouts, escaping, and clean console/network output.

## Boundaries

- Always: authenticate writes, enforce CSRF, validate and cap content, parameterize queries,
  server-derive protected fields, escape output, and hide comments with their hidden report.
- Ask first: add anonymous comments, replies, comment editing/deletion, new personal-data fields,
  rate limiting, automated filtering, moderation, notifications, or retention changes.
- Never: accept client authorship/timestamps, expose private account/report fields, render comment
  HTML, concatenate SQL, or create a comment for a hidden/missing report.

## Success Criteria

- Guests can read comments and receive a safe login path instead of a write form.
- Authenticated users can submit a valid native form and return to the report through `303`.
- Invalid, CSRF-failing, hidden-report, and missing-report submissions write nothing.
- Public output is cursor-bounded, stably ordered, escaped, and limited to comment text, date, and
  username.
- Existing report privacy, feed, creation, and detail behavior remains intact.
- Focused tests, full tests, typecheck, build, lint, format, and route validation pass.

## Open Questions

None.
