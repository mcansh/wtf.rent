# Spec: Report Editing

Module id: `report-editing`

## Objective

Let an authenticated report author correct their own published renter report through a
server-rendered edit page. The author can change the complete report form while the server
preserves ownership, visibility, identity, and creation history. Guests redirect to login;
authenticated non-owners and requests for hidden or missing reports receive the standard `404`.

## Tech Stack

- Existing Node.js, TypeScript, Remix 3, PostgreSQL, and `remix/data-table` stack
- Existing session authentication, CSRF middleware, and resource routes
- Existing report validation and reusable server-rendered report form
- No new dependency or database migration

## Commands

- Focused tests: `pnpm test -- app/actions/post/controller.test.tsx app/data/reports.test.ts app/actions/post/report-input.test.ts`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Lint check: `pnpm exec oxlint .`
- Format check: `pnpm exec oxfmt --check .`
- Route validation: `pnpm exec remix routes`

## Project Structure

- `app/routes.ts` — existing `GET /posts/:id/edit` and `PUT /posts/:id` contract
- `app/router.ts` — native HTML `POST` to `PUT` method override support
- `app/actions/post/controller.tsx` — authentication, authorization, validation, and responses
- `app/actions/post/edit-report.tsx` — route-owned edit-page presentation
- `app/actions/post/public/report-form.tsx` — shared create/edit form presentation
- `app/actions/post/report-input.ts` — shared report form boundary validation
- `app/data/reports.ts` — owner-scoped private read and update operations
- Colocated tests — validation, data, authorization, response, and privacy coverage

## Code Style

Keep authorization in the persisted operation as well as the controller response path:

```tsx
let report = await findEditableReport(context.params.id, currentUser.id)
if (report == null) return notFound(context.render)

let parsed = parseUpdateReportInput(context.formData)
if (!parsed.success) {
  return renderEditReport(
    context,
    report,
    parsed.issues,
    getSafeReportValues(context.formData),
    422,
  )
}

await updateReport(report.id, parsed.value, {
  authorId: currentUser.id,
  confirmedAt: new Date(),
})
return redirect(routes.post.show.href({ id: report.id }), 303)
```

- Use route helpers for every internal URL.
- Return explicit `404`, `422`, and `303` responses for expected outcomes.
- Render user values only as escaped JSX text or form values.
- Reuse the full report validator; do not create a weaker edit-only contract.

## Route and Data Contract

### Edit page: `GET /posts/:id/edit`

- Requires authentication.
- Returns `200` only when the current user owns a `PUBLISHED` report.
- Prefills every editable report field, including the private stored street address.
- Marks the response `Cache-Control: private, no-store` and `Vary: Cookie` because it contains the
  private address, owner-specific controls, and a CSRF token.
- Requires the firsthand/privacy checkbox again before saving.
- A legacy report may be edited, but the author must complete every structured field before save.
- Returns the standard `404` for a missing, hidden, or other user's report.

### Update: `PUT /posts/:id`

- Accepts a native form `POST` carrying `_method=PUT` through Remix method-override middleware.
- Requires authentication and a valid CSRF token.
- Applies the same normalization, bounds, category/rating rules, address privacy checks, and
  firsthand attestation as report creation.
- Returns an accessible `422` edit page with bounded safe values when validation fails.
- Marks every rendered `422` edit response private and non-cacheable.
- Updates only address, city, region, landlord name, category, rating, title, and content.
- Preserves id, author id, status, creation time, and an existing firsthand confirmation time.
- Sets a confirmation time when a legacy report without one is completed through the edit form.
- Redirects to the public report detail with `303` after a successful update.
- Is unsafe to retry as an exact transport guarantee because `updatedAt` changes on each write.

## Testing Strategy

- Validation tests prove edit input follows the complete create contract.
- Data tests prove owner-scoped reads include the private address without widening public
  projections, owner-scoped updates preserve protected fields, and non-owner/hidden/missing writes
  do nothing.
- Controller tests cover guest redirects, owner form/category prefill, private cache directives,
  GET and PUT non-owner/hidden/missing `404`, legacy completion, CSRF rejection, linked `422`
  errors, safe value preservation, protected-field forgery, and `303` success.
- Browser verification covers keyboard order, a no-JavaScript native update, responsive layouts,
  no private address on the resulting public page, and a clean console/network log.

## Boundaries

- Always: authenticate, authorize by immutable author id, validate at the action boundary,
  parameterize persistence, enforce CSRF, and keep the street address out of public responses.
- Ask first: expose addresses, allow edits to hidden reports, add deletion, change retention, add
  fields containing new personal-data categories, or change moderation behavior.
- Never: trust submitted ownership/status/timestamps, reveal whether another user owns a requested
  id, weaken the full report contract, render raw HTML, or update a report by id without ownership.

## Success Criteria

- The author can open a prefilled edit page and save a valid correction through native HTML.
- Owner-only GET and rendered validation responses cannot be stored by shared or browser caches.
- Invalid updates return linked field errors and write nothing.
- Guests cannot reach edit/update; non-owners, hidden reports, and missing reports share `404`.
- Forged protected fields cannot change ownership, visibility, identity, or creation history.
- Public detail still excludes the stored street address and private account data after editing.
- Focused tests, full tests, typecheck, build, lint, format, and route validation pass.

## Open Questions

None.
