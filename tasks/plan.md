# Implementation Plan: Renter Reports Vertical Slice

Approved contract: [`docs/specs/reports/core.md`](../docs/specs/reports/core.md)

Architecture decision: [`ADR-001`](../docs/decisions/001-preserve-post-storage-for-renter-reports.md)

Location privacy decision:
[`ADR-002`](../docs/decisions/002-withhold-street-addresses-from-public-report-output.md)

Historical authentication plan and completion evidence remain in `tasks/archive/auth-plan.md` and
`tasks/archive/auth-todo.md`.

## Current State

The Remix 3 migration has working credential authentication, session-backed CSRF protection, an
injected `Database`, a public styled home page, and a typed `/posts` resource. The report behavior
behind that presentation is unfinished:

- The home page filters three in-memory sample reviews and displays fabricated activity counts.
- Post create and destroy redirect home; new, edit, and show return `404`; update has no persistence.
- `Post` stores only title, content, timestamps, and author id.
- The auth test database supports users only, so it cannot verify report joins, ordering, or search.
- Request logging is development-only and has no correlation id or production-safe structured
  format.

The implementation must preserve the completed auth behavior and existing Post/Comment rows while
making create, feed, and detail real.

## Architecture

| Component                   | Responsibility                                                                                                    | Depends on                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Request telemetry           | Correlate requests and emit privacy-safe structured method/path/status/duration outcomes                          | Existing router response wrapping |
| Persisted report contract   | Add legacy-safe Post columns, constraints, visibility state, and public-feed index                                | Existing User/Post/Comment schema |
| Report validation           | Normalize and bound form/query input, reject unit designators, map categories to labels                           | Approved report contract          |
| Report test database        | Run real data-table queries against isolated in-memory SQLite with deterministic time                             | Persisted report contract         |
| Report data access          | Create reports and query public summaries/details/counts with typed projections that omit stored street addresses | Schema, validation, test database |
| Creation slice              | Render the protected form, enforce CSRF/attestation, persist, and redirect                                        | Data access and existing auth     |
| Detail slice                | Render published and legacy reports; hide missing/hidden distinctions                                             | Data access                       |
| Discovery slice             | Replace samples with server data, bounded search, counts, pagination, and empty states                            | Data access and detail URLs       |
| Operations and verification | Prove migration compatibility, telemetry safety, accessibility, responsive behavior, and launch limitations       | All prior components              |

Dependency order:

1. Request telemetry and persisted report contract
2. Validation and isolated report test database
3. Report data access
4. Creation
5. Detail
6. Discovery
7. Operations documentation and complete verification

Request telemetry and schema work do not overlap and are logically parallel. After data access is
stable, creation, detail, and discovery are behaviorally separable, but they share
`app/actions/post/controller.tsx`, the home report card, and test fixtures. Implement them
sequentially to keep each diff reviewable. Independent verification commands may run in parallel.

## Implementation Steps

### 1. Add correlated, privacy-safe request outcomes

- Add `app/middleware/request-telemetry.ts` with an injectable sink and clock for deterministic
  tests.
- Accept `X-Request-ID` only when it matches a bounded safe character set; otherwise generate a
  UUID.
- Wrap the downstream response once, preserve body/status/status text/headers, and add the request
  id header.
- Emit JSON records for completed and unexpectedly failed requests containing only event,
  requestId, method, pathname, status class, and duration.
- Exclude query strings, bodies, cookies, user/report fields, and raw exception messages.
- Install the middleware for non-test production behavior while allowing tests to inject a
  collector; retain readable development logging only if it does not duplicate records.

Checkpoint: focused router tests prove response preservation, request-id validation/generation,
correlated failures, and absence of sensitive request values; existing auth tests and typecheck
pass.

### 2. Extend Post storage without invalidating legacy rows

- Export the report category and status values from `app/data/schema.ts` and add nullable report
  metadata columns plus non-null `PUBLISHED` status.
- Preserve id/timestamp hooks and all existing Post/Comment relations.
- Add a transactional SQL migration with nullable address/city/region/landlord/category/rating/
  confirmation columns, status default/backfill, category/rating/status checks, and a public-feed
  `(status, createdAt desc, id desc)` index.
- Do not add fabricated defaults for metadata missing from old rows.
- Extend schema tests to prove types, allowed enum values, automatic ids/timestamps, and legacy
  writes.

Checkpoint: schema tests, migration dry-run/status inspection, and typecheck pass; the migration
diff contains no rename, drop, or relation rewrite.

### 3. Build report input contracts and an isolated database harness

- Put route-owned create/query parsing in focused modules under `app/actions/post/`.
- Define one category-label map used by form options and public metadata.
- Trim and bound all fields, normalize optional landlord blanks to null, coerce rating safely, and
  require the firsthand checkbox.
- Reject common unit designators in the dedicated address field and preserve only bounded safe
  values on `422`.
- Normalize feed `q` to at most 100 characters and invalid/missing `page` to 1; escape SQL `LIKE`
  metacharacters so search remains literal substring matching.
- Add `test/reports.ts` backed by Node's in-memory SQLite and the Remix SQLite adapter, with helpers
  for schema creation, deterministic users/reports, auth cookies, and CSRF round trips.
- Keep the existing auth-only fake database unchanged unless shared behavior genuinely needs it.

Checkpoint: pure validation tests and report-fixture smoke tests pass without PostgreSQL, real
secrets, network access, or cross-test state.

### 4. Implement typed report persistence and public queries

- Add `app/data/reports.ts` with explicit input/output types for create, list, and detail.
- Create through `Database.create(..., { returnRow: true })`; accept author id and confirmation time
  only from trusted controller inputs.
- Build a reusable public predicate that always includes `status = PUBLISHED` and conditionally ORs
  parameterized case-insensitive matches across approved public fields, never the stored street
  address.
- Query Post joined to User with allowlisted projections containing username but never street
  address, email, or password.
- Return newest-first summaries with an id tie-breaker, fixed limit/offset, matching total, and
  page metadata; query detail by id through the same visibility predicate.
- Keep legacy nullable metadata in output types rather than manufacturing values.
- Verify SQLite and PostgreSQL compile equivalent `ilike`, join, count, order, and pagination
  intent; use the typed raw-SQL escape hatch only if the normal query builder cannot meet the
  approved substring semantics.

Checkpoint: data tests cover create, author attribution inputs, search fields and literal wildcard
characters, newest-first ties, pagination, hidden exclusion, legacy rows, and allowlisted output.

### 5. Implement the authenticated creation slice

- Keep the existing typed resource contract and implement only `new` and `create`; retain the
  protected deferred edit/update/destroy placeholders.
- Render a route-owned, paper/ink/acid report form with semantic fieldsets, visible labels, helper
  text, category/rating controls, privacy notice, linked errors, and active CSRF token.
- State plainly that the street address is stored but not shown publicly and that city/region is
  the only public structured location.
- Make the native GET/POST flow complete without JavaScript.
- Add a small progressive enhancement that disables the submit controls after a valid submission;
  do not claim server idempotency.
- On invalid input return the same form with `422`; on success derive the authenticated user,
  persist `PUBLISHED` plus server confirmation time, and redirect to show with `303`.
- Ignore any client-supplied author, status, id, or timestamp fields.

Checkpoint: controller tests cover guest redirects, valid GET/CSRF, each validation class, unit
rejection, forged server-owned fields, no-write failures, successful persistence, and exact `303`
location; keyboard and no-JavaScript smoke checks pass.

### 6. Implement the public report detail slice

- Resolve the typed id through report data access and return the standard `404` for absent or hidden
  rows.
- Render title, rating, category, city/region location, optional landlord, username, dates, and
  whitespace-preserving escaped content; never return or display the stored street address.
- Render legacy rows without empty badges or fabricated metadata.
- Use the existing document shell and route-generated navigation links.
- Do not expose edit, delete, comments, cheers, saves, email, or client-serialized user records.

Checkpoint: controller tests cover published, legacy, hidden, missing, malicious-text escaping, and
absence of private account fields; responsive page smoke checks pass.

### 7. Replace the mock home feed with real discovery

- Parse `q` and `page` in the root home action, query the injected database, and pass plain
  serializable/server-renderable report results to the home presentation.
- Remove in-memory reviews, fake weekly/report counts, fake city state, tabs, social controls, and
  toast behavior for deferred features.
- Preserve the established visual language while making cards link to report detail and show only
  real public metadata, with city/region as the only location.
- Keep search as a normal GET form with shareable URLs and its submitted value visible.
- Add total/result copy, truthful legacy fallbacks, a create-report empty state, and route-generated
  previous/next pagination that preserves `q`.
- Ensure page 1 never emits a redundant page parameter and pages beyond the result set remain a
  valid empty state rather than leaking database behavior.

Checkpoint: root controller tests cover default/search/no-result/legacy/hidden/paginated feeds,
real counts, URL preservation, and no sample copy; browser checks cover search and pagination.

### 8. Prove migration, operations, and launch readiness

- Add an operator runbook for locating, hiding, exporting, and deleting a report by id or author id
  with transaction-safe SQL, including dependent comments and verification queries.
- Apply the migration to a representative PostgreSQL database containing a user, legacy post, and
  comment; verify ids, relations, legacy rendering, and rollback expectations without modifying an
  applied migration.
- Exercise join → create report → detail → feed search/pagination → logout in a real browser and
  verify the no-JavaScript create path separately.
- Inspect actual structured success/error log records by request id and confirm no query/body/PII
  values appear.
- Run build, all tests, typecheck, Oxlint, Oxfmt check, route diagnostics, Remix Doctor, dependency
  audit, `git diff --check`, and a secret/scope review.
- Test keyboard flow and layouts at 320/768/1024/1440 px with no horizontal overflow, console
  errors, or failed network requests.
- Record evidence or a precise external blocker beside each checklist item; broad public launch
  remains blocked on the moderation/legal follow-up named in the spec.

Checkpoint: every success criterion in `docs/specs/reports/core.md` has evidence or a documented external
blocker, and the final diff contains no unrelated change or generated dependency cache.

## Verification Cadence

After every implementation step:

1. Run the narrowest new or changed tests.
2. Run `pnpm typecheck`.
3. Run `git diff --check` and inspect the path-scoped diff.
4. Update the task checklist with evidence before starting the next step.

Run the complete verification matrix only after focused loops are green. Do not auto-fix the whole
repository or format unrelated files.

## Risks and Mitigations

| Risk                                                            | Mitigation                                                                                                                                                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Additive columns weaken new-row invariants                      | Enforce complete writes in form validation/data access and mirror every feasible constraint in SQL; nullable fields exist only for legacy compatibility                                                   |
| `%term%` search scans as data grows                             | Bound query/page size, add the public-order index, inspect query plans with representative data, and defer trigram/full-text infrastructure until measured                                                |
| LIKE wildcard characters broaden user searches                  | Escape `%`, `_`, and the escape character; cover literal wildcard searches in data tests                                                                                                                  |
| Stored street addresses leak through a public code path         | Omit the field at the SQL projection and search boundary, omit it from public types/serializers, and assert unique private markers never reach results or HTML                                            |
| SQLite tests differ from PostgreSQL                             | Use SQLite for deterministic router/query coverage and a representative PostgreSQL migration/search smoke test before completion                                                                          |
| Home UI currently depends on client-only sample state           | Make feed/search/pagination server-first; hydrate only the submit-lock enhancement                                                                                                                        |
| Duplicate form retries create duplicate rows                    | State the non-idempotent contract, disable repeat submission when hydrated, and avoid claiming retry safety                                                                                               |
| Public reports enable privacy, harassment, and defamation abuse | Keep street addresses out of public output/search, reject unit data, require attestation, escape content, provide HIDDEN state/operator removal, and keep broad launch blocked on moderation/legal policy |
| Global request logs accidentally capture report data            | Log only an allowlisted pathname/method/status/duration/requestId shape and assert excluded values in tests                                                                                               |
| Existing auth fixtures become fragile                           | Add an isolated report database fixture rather than widening the auth-only fake unless required                                                                                                           |
| Dependency installation cannot reach configured registries      | Use the committed pnpm lock and existing approved store where possible; report or request network approval only when a required verification cannot run                                                   |

## Intentionally Unchanged

- Login, registration, logout, session lifetime, CSRF semantics, and login throttling
- Post edit/update/destroy behavior beyond retaining existing authentication protection
- Comment persistence and the unfinished comment UI
- Canonical Property/Landlord entities, geocoding, maps, nearby discovery, and category filters
- Images/evidence, cheers, saves, following, notifications, and personalized feeds
- Immediate-publication policy and the absence of moderation UI
- Account export/deletion implementation and automated retention enforcement
- CI, deployment topology, package versions, and dependency set

## Extension: Report Editing and Comments

Approved capability map:
[`docs/specs/reports/README.md`](../docs/specs/reports/README.md)

Approved contracts: [`docs/specs/reports/editing.md`](../docs/specs/reports/editing.md) and
[`docs/specs/reports/comments.md`](../docs/specs/reports/comments.md)

### Dependency graph

```text
Existing renter-report core
├── report-editing
│   ├── shared validation + owner-scoped data operations
│   └── method override + edit/update controller + reusable form
└── report-comments
    ├── comment validation + public/trusted data operations
    └── nested create route + report-detail list/form
```

`report-editing` and `report-comments` are independent. They are implemented sequentially because
both modify the post controller and report-detail area; keeping one focused diff green avoids
conflicting route and presentation changes.

### 9. Record the approved extension contracts

- Persist the approved capability map and one spec per stable module id.
- Update the original report spec's deferred and resolved decisions without weakening its privacy,
  retention, or moderation boundaries.
- Add dependency-ordered tasks with acceptance criteria and verification commands.

Checkpoint: every approved assumption is represented by a testable contract and there are no open
questions.

### 10. Implement report editing in two vertical increments

- First prove shared validation, owner-scoped private reads, protected-field preservation, and
  owner-scoped updates with focused data tests.
- Then add method override, the prefilled edit page, reusable create/edit form behavior, controller
  authorization, `422` responses, and the `303` success path.
- Keep public projections address-free and return the standard `404` for non-owner, hidden, and
  missing ids.

Checkpoint: editing-focused tests and existing report tests pass; a native form can update an
owned report without exposing its private address publicly.

### 11. Implement report comments in two vertical increments

- First prove bounded input parsing, trusted creation, cursor-bounded allowlisted public reads,
  stable ordering, report isolation, hidden-report exclusion, and an indexed access path.
- Then add the nested comment route and render public comments, empty state, authenticated form,
  guest login prompt, linked `422` errors, and the `303` success path on report detail.
- Preserve plain-text escaping and existing report visibility/privacy behavior.

Checkpoint: comment-focused tests and all report tests pass; native comment submission works,
public output contains no private account or report fields, and each read/render is capped at 50.

### 12. Complete the extension quality gate

- Run the full test, typecheck, build, lint, format, route, and diff checks.
- Exercise owner edit, non-owner denial, guest comment prompt, authenticated comment creation,
  validation errors, escaping, keyboard order, and responsive layouts in a real browser.
- Review authorization, CSRF, public projections, secret exposure, and scope before handoff.

Checkpoint: both extension specs have evidence or a precise external blocker, with no unrelated
changes, new dependencies, or database migration.

### Extension risks and mitigations

| Risk                                                | Mitigation                                                                                                              |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| An authenticated user edits another renter's report | Scope private reads and writes by report id plus immutable author id; use indistinguishable `404` responses             |
| The edit page becomes a new address leak            | Return the private field only from the owner-scoped query and keep it out of public types, detail output, and comments  |
| Method override bypasses mutation controls          | Parse the form once, override before session/CSRF middleware, and test native `POST` plus `_method=PUT` end to end      |
| Comment text enables stored XSS or oversized writes | Trim and cap plain text at 1,000 characters, then render only escaped JSX                                               |
| Hidden reports leak through comments                | Join public comment reads through `Post.status = 'PUBLISHED'` and reject comment writes after a published-report lookup |
| Duplicate submissions create extra comments         | Document comment creation as unsafe to retry; keep each accepted submission as a distinct comment                       |
| Owner edit HTML is cached after logout              | Mark private report forms and authenticated detail variants `private, no-store` and `Vary: Cookie`                      |
| Comment history makes detail responses unbounded    | Use 50-row keyset pages backed by a `(postId, createdAt, id)` index                                                     |

### Extension intentionally unchanged

- Report/comment deletion, replies, reactions, saves, following, and notifications
- Report visibility policy, moderation UI, flags, appeals, automated filtering, and rate limiting
- Street-address privacy, public feed/search behavior, auth/session lifetime, and login throttling
- Comment columns/relationships, dependencies, CI, and deployment topology; one additive feed
  index migration is included
