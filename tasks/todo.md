# Renter Reports Task Checklist

Status: Active — tasks 12–14 remain open; completed tasks are retained below as historical evidence.

Approved contract: [`docs/specs/reports/core.md`](../docs/specs/reports/core.md)

Approved implementation plan: [`tasks/plan.md`](./plan.md)

Historical authentication completion evidence remains in [`tasks/archive/auth-todo.md`](./archive/auth-todo.md).

- [x] Task 1: Add correlated, privacy-safe request telemetry
  - Acceptance: Every application response carries a valid `X-Request-ID`; safe inbound ids are
    preserved, invalid ids are replaced, completed and failed requests emit correlated structured
    outcomes, response bodies/status/headers survive wrapping, and logged fields cannot contain
    query strings, form values, cookies, report data, account data, or raw errors.
  - Verify: `pnpm test -- app/middleware/request-telemetry.test.ts app/router.test.ts`;
    `pnpm typecheck`; `git diff --check`.
  - Files: `app/middleware/request-telemetry.ts`,
    `app/middleware/request-telemetry.test.ts`, `app/router.ts`, `app/router.test.ts`.
  - Evidence: 37/37 application tests passed, including four telemetry cases and router/static
    integration; `pnpm typecheck`, task-scoped Oxlint, task-scoped Oxfmt check, and
    `git diff --check` passed. Actual records contain only event, request id, method, pathname,
    status class, and duration; sink failures do not alter responses.

- [x] Task 2: Add the legacy-safe report schema and migration
  - Acceptance: `Post` gains nullable report metadata, a non-null status restricted to `PUBLISHED`
    or `HIDDEN`, rating/category/status constraints, plus the public ordering index; old Post and
    Comment rows, identifiers, foreign keys, id generation, and timestamps remain valid without
    fabricated metadata.
  - Verify: `pnpm test -- app/data/schema.test.ts`; `pnpm typecheck`;
    `pnpm exec remix db migrate`; inspect the migration for only additive operations;
    `git diff --check`.
  - Files: `app/data/schema.ts`, `app/data/schema.test.ts`,
    `db/migrations/<timestamp>_add_report_fields/up.sql`.
  - Evidence: Five focused schema tests and all 39 application tests passed; `pnpm typecheck`,
    task-scoped Oxlint, task-scoped Oxfmt check, and `git diff --check` passed. Migration
    `20260817153015_add_report_fields` applied to local PostgreSQL and status reports it applied;
    live metadata confirms seven nullable report fields, non-null `PUBLISHED` status default,
    three checks, and the public-feed index. The migration contains no drop, rename, delete, or
    relation rewrite; representative populated-data proof remains Task 12.

- [x] Task 3: Define and test report input contracts
  - Acceptance: One category/label contract serves form and search metadata; create parsing trims
    and bounds every value, normalizes an empty landlord to null, accepts only integer ratings 1–5
    and approved categories, requires firsthand confirmation, rejects common unit designators, and
    never returns unbounded values; feed parsing caps `q`, normalizes `page`, and escapes literal
    `LIKE` metacharacters.
  - Verify: `pnpm test -- app/actions/post/report-input.test.ts`; `pnpm typecheck`;
    `git diff --check`.
  - Files: `app/actions/post/report-input.ts`, `app/actions/post/report-input.test.ts`.
  - Evidence: All 11 focused validation tests passed, covering normalization, bounds, optional
    landlord handling, every category, integer ratings, attestation, six unit-designator forms,
    bounded redisplay values, page fallback, query caps, literal wildcard escaping, and category
    labels. `pnpm typecheck`, task-scoped Oxlint, task-scoped Oxfmt check, and `git diff --check`
    passed.

- [x] Task 4: Add the isolated report database harness and create operation
  - Acceptance: Tests can create deterministic users, legacy posts, structured reports, sessions,
    and CSRF round trips in isolated in-memory SQLite without network, PostgreSQL, real secrets, or
    cross-test state; `createReport` uses typed trusted inputs and returns the stored row with
    server-owned author, status, and confirmation time.
  - Verify: `pnpm test -- app/data/reports.test.ts`; `pnpm typecheck`; `git diff --check`.
  - Files: `test/reports.ts`, `app/data/reports.ts`, `app/data/reports.test.ts`.
  - Evidence: Three focused harness/write tests and all 53 application tests passed. Separate
    in-memory SQLite apps retain no cross-test rows; deterministic user, legacy, and structured
    fixtures preserve `Date` values and database constraints; an authenticated session completed a
    CSRF-protected logout round trip using test-only cookie/storage state. `createReport` ignored
    forged id, author, status, and timestamp properties while storing the trusted author and
    confirmation time as `PUBLISHED`. `pnpm typecheck`, task-scoped Oxlint, task-scoped Oxfmt
    check, and `git diff --check` passed without PostgreSQL, network access, or runtime secrets.

- [x] Task 5: Implement and test public report listing and search
  - Acceptance: Listing always excludes `HIDDEN` rows, searches approved fields and category labels
    case-insensitively with literal wildcard handling, never selects or searches the stored street
    address, returns only allowlisted report fields plus username, uses a fixed 20-row limit and
    matching total, and orders by creation time then id newest-first with stable page metadata;
    legacy nulls remain null.
  - Verify: `pnpm test -- app/data/reports.test.ts`; inspect generated SQLite/PostgreSQL query intent;
    `pnpm typecheck`; `git diff --check`.
  - Files: `app/data/reports.ts`, `app/data/reports.test.ts`.
  - Evidence: Six focused listing tests and all 76 application tests passed. The tests cover exact
    output keys, private-field exclusion, published/hidden visibility, honest legacy nulls, all
    six approved public searchable fields, every category label, case-insensitivity, literal `%`,
    `_`, and `!`, same-timestamp id ordering, 23-row page boundaries, and predicate-matched totals.
    A unique stored-address marker is neither returned nor searchable. Executed SQLite statements
    and a no-network PostgreSQL recorder prove the same parameterized inner join, `ESCAPE '!'`
    predicates, count, newest/id order, `LIMIT 20`, and offset intent; PostgreSQL uses `$n`
    placeholders and selects neither address, email, nor password. `pnpm typecheck`, task-scoped
    Oxlint, task-scoped Oxfmt check, and `git diff --check` passed.

- [x] Task 6: Implement and test the public report detail query
  - Acceptance: Detail returns an allowlisted published or legacy report projection with public
    username and city/region but no stored street address, returns no row for hidden or missing ids,
    and never selects or serializes email, password, or other private account fields.
  - Verify: `pnpm test -- app/data/reports.test.ts`; `pnpm typecheck`; `git diff --check`.
  - Files: `app/data/reports.ts`, `app/data/reports.test.ts`.
  - Evidence: Two focused detail-query tests and all 76 application tests passed. A published
    structured report returns exactly the public report fields, confirmation/creation dates, and
    username; street address, email, password, author id, status, and update metadata are absent. A
    legacy report retains nullable public metadata, while hidden, missing, and SQL-like hostile ids
    all return `null` through the shared published predicate and a bound id parameter. `pnpm
typecheck`, task-scoped Oxlint, task-scoped Oxfmt check, and `git diff --check` passed.

- [x] Task 7: Render the authenticated new-report form
  - Acceptance: `GET /posts/new` remains guest-protected and renders a semantic paper/ink/acid form
    for authenticated users with visible labels, helper text, category/rating controls, the active
    CSRF token, the required firsthand/privacy confirmation, and a clear notice that the street
    address is stored but not shown publicly while city/region and username become public; the form
    works without JavaScript.
  - Verify: `pnpm test -- app/actions/post/controller.test.tsx`; `pnpm typecheck`;
    keyboard and JavaScript-disabled form smoke checks; `git diff --check`.
  - Files: `app/actions/post/controller.tsx`, `app/actions/post/new-report.tsx`,
    `app/actions/post/controller.test.tsx`, `test/reports.ts`.
  - Evidence: The authenticated page renders one native POST form with the live CSRF token, visible
    labels and helper text, all approved category/rating controls, the required firsthand/privacy
    confirmation, and explicit stored-address/private plus city-region/username-public disclosure.
    The privacy correction passes all 76 application tests; the earlier form gate passed 61 tests,
    `pnpm build`, `pnpm typecheck`, task-scoped Oxlint, task-scoped Oxfmt check, and
    `git diff --check` passed. Browser inspection found a semantic landmark/fieldset/label tree,
    no positive `tabindex`, no console warning or error, and no horizontal overflow at 320, 768,
    1024, or 1440 px. With script execution disabled, the native form, address field, and submit
    button remained available. The in-app browser delivered typed keys but did not advance focus
    for simulated Tab presses, so keyboard order was additionally verified from the native DOM
    control order; the full manual keyboard journey remains in Task 13.

- [x] Task 8: Implement authenticated report creation and validation responses
  - Acceptance: `POST /posts` requires auth and valid CSRF, ignores forged server-owned fields,
    returns accessible field-linked `422` responses with only bounded safe values and no write on
    every invalid class, persists a complete `PUBLISHED` report for the current user on success,
    redirects to its detail URL with exact `303`, and prevents repeat clicks when JavaScript is
    active without claiming server idempotency.
  - Verify: `pnpm test -- app/actions/post/controller.test.tsx`; `pnpm typecheck`;
    no-JavaScript create smoke test; `git diff --check`.
  - Files: `app/actions/post/controller.tsx`, `app/actions/post/new-report.tsx`,
    `app/actions/post/controller.test.tsx`, `test/reports.ts`.
  - Evidence: All 66 application tests passed. Missing/invalid CSRF returned `403` with no write;
    six invalid input classes returned field-linked `422` responses with no write; redisplayed
    values were bounded and JSX-escaped. A valid request ignored forged id, author, status, and
    timestamp fields, persisted normalized data for the authenticated user as `PUBLISHED`, and
    returned an exact `303` to the generated detail URL. The route contract now generates
    `GET /posts/:id`. Hydrated inputs retained edits, a rapid repeat click produced exactly one
    write, and a JavaScript-disabled native submission increased the report count from three to
    four and reached its generated detail URL; the server remains explicitly non-idempotent.
    The normal hydrated browser console had no warnings or errors. `pnpm build`, `pnpm typecheck`,
    task-scoped Oxlint, task-scoped Oxfmt check, `pnpm exec remix routes`, and `git diff --check`
    passed.

- [x] Task 9: Render published and legacy report detail pages
  - Acceptance: `GET /posts/:id` renders escaped title/body, structured metadata, optional landlord,
    public username, city/region, and dates for a published report without its stored street
    address; legacy rows omit unavailable metadata honestly; hidden and missing rows share the
    standard `404`; no private user fields or deferred edit, delete, comment, cheer, or save
    controls appear.
  - Verify: `pnpm test -- app/actions/post/controller.test.tsx`; `pnpm typecheck`;
    responsive detail smoke check; `git diff --check`.
  - Files: `app/actions/post/controller.tsx`, `app/actions/post/report-detail.tsx`,
    `app/actions/post/controller.test.tsx`.
  - Evidence: The privacy correction passes all 76 application tests. Published detail renders
    escaped title/body, category, rating, city/region, optional landlord, public username,
    publication date, and firsthand-confirmation date from the allowlisted query; a unique stored
    street marker is absent, hostile markup stays text, and neither email nor password appears.
    Legacy detail renders its original title/body/username/date plus an
    explicit pre-structured-data notice without fabricating metadata. Hidden and missing ids return
    byte-identical standard `404` bodies and expose no hidden content; no edit, delete, comment,
    cheer, or save controls render. Browser snapshots confirmed the semantic article/details
    structure and honest legacy state. At 320/768/1024/1440 px, document width exactly matched the
    viewport; the desktop layout resolved to a 728 px article and 312 px detail rail, the mobile
    username stayed intact, and browser logs were empty. `pnpm build`, `pnpm typecheck`, task-scoped
    Oxlint, task-scoped Oxfmt check, and `git diff --check` passed.

- [x] Task 10: Connect the home action to persisted discovery
  - Acceptance: `GET /` parses bounded `q` and `page`, queries the injected database, and supplies
    serializable report results without stored street addresses, total, and page metadata; tests
    prove default, search, no-result, legacy, hidden, and out-of-range page behavior using real
    report queries rather than sample arrays or fabricated counts.
  - Verify: `pnpm test -- app/actions/controller.test.tsx`; `pnpm typecheck`;
    `git diff --check`.
  - Files: `app/actions/controller.tsx`, `app/actions/controller.test.tsx`, `test/reports.ts`.
  - Evidence: All 76 application tests passed, including six controller-to-render tests backed
    by isolated SQLite and the real report query. The default page serialized published structured
    and legacy rows newest-first, excluded hidden rows and private account markers, converted dates
    to ISO strings, and supplied the exact total/page/page-size/page-count/previous/next metadata.
    Search trimmed case-insensitively through the real operation while an invalid page normalized
    to one; a 120-character query was capped at 100 and produced a truthful zero-result page; a
    positive out-of-range page retained page 999 with the real total and no fabricated rows.
    `pnpm typecheck`, task-scoped Oxlint, task-scoped Oxfmt check, and `git diff --check` passed.
    Task 11 subsequently removed unnecessary home-page hydration while preserving the serializable
    server boundary. A dedicated privacy case proves the default HTML omits a stored street marker
    and an address-only query returns no report while city/region remains visible.

- [x] Task 11: Replace the mock home presentation with the real report feed
  - Acceptance: The home page preserves its established visual language while rendering only real
    public report metadata and detail links, with city/region as the only structured location and
    no stored street address in queries, search, client props, or HTML; the GET search form has a
    shareable retained query; previous and next links preserve `q` without redundant `page=1`;
    truthful result and empty-state copy replaces sample reports, fake city/activity/count data,
    tabs, social controls, and mock toasts.
  - Verify: `pnpm test -- app/actions/controller.test.tsx`; `pnpm build`; `pnpm typecheck`;
    browser search/pagination smoke check; `git diff --check`.
  - Files: `app/actions/home-page/public/page.tsx`,
    `app/actions/home-page/public/review.tsx`, `app/actions/controller.test.tsx`.
  - Evidence: All 76 application tests passed, including public-query, controller-render, detail,
    and form-disclosure privacy regressions with unique stored street markers. `pnpm build`, `pnpm
typecheck`, task-scoped Oxlint, task-scoped Oxfmt check, and `git diff --check` passed. An
    isolated browser run with 21 persisted reports rendered 20 real cards on page one, showed
    `Detroit, MI` on every card, and contained no `PRIVATE-STREET-MARKER` in the full document HTML.
    Searching an exact stored marker returned zero reports. Searching `Detroit` retained
    `/?q=Detroit#feed`, reported 1–20 of 21, and linked to `/?q=Detroit&page=2#feed`; page two
    reported 21–21 of 21 and linked back without `page=1`. A public detail rendered `Location` as
    `Detroit, MI`, no `Building` term, and no stored marker. Browser warning/error logs were empty.

- [ ] Task 12: Document and prove report operations and migration compatibility
  - Acceptance: An operator runbook gives transaction-safe locate, hide, export, and delete
    procedures by report id or author id, covers dependent comments and verification queries, and
    states rollback expectations; the additive migration is exercised against representative
    PostgreSQL data containing a user, legacy post, and comment with ids and relations preserved.
  - Verify: Start the repository PostgreSQL service; seed representative rows; run
    `pnpm exec remix db migrate`; execute every runbook verification query inside a rollback-only
    transaction; record exact evidence or an external blocker here; `git diff --check`.
  - Files: `docs/runbooks/report-operations.md`,
    `db/migrations/<timestamp>_add_report_fields/up.sql`, `tasks/todo.md` (evidence only).

- [ ] Task 13: Complete browser, accessibility, and telemetry verification
  - Acceptance: A real journey covers join, create, detail, feed search/pagination, and logout;
    native creation works with JavaScript disabled; keyboard focus and field errors are usable;
    320/768/1024/1440 px layouts have no horizontal overflow; browser console/network checks are
    clean; sampled success/error logs correlate by request id and contain no query, body, report,
    cookie, or account PII.
  - Verify: Run the production-like app against the representative database and execute the stated
    journey at all four widths with browser tooling; inspect captured log records; record evidence
    or a precise blocker here.
  - Files: `tasks/todo.md` (evidence only; split any discovered defect into a focused task before
    changing product files).

- [ ] Task 14: Run the complete quality and scope gate
  - Acceptance: Every success criterion in `docs/specs/reports/core.md` has evidence or a precise external
    blocker; the final diff contains no secret, generated dependency cache, unrelated edit, or
    implementation of deferred scope; broad public launch remains explicitly blocked on the
    approved moderation/legal follow-up.
  - Verify: `pnpm build`; `pnpm test`; `pnpm typecheck`; `pnpm exec oxlint .`;
    `pnpm exec oxfmt --check .`; `pnpm exec remix routes`; `pnpm exec remix doctor`;
    `pnpm audit`; `git diff --check`; inspect `git status --short` and the complete diff.
  - Files: `docs/specs/reports/core.md`, `tasks/todo.md` (status/evidence only).

## Approved Extension: Report Editing and Comments

- [x] Task 15: Record the report-interactions capability map and module specs
  - Acceptance: Stable `report-editing` and `report-comments` modules have complete, approved,
    testable contracts; the original report spec no longer lists those exact capabilities as
    deferred and retains every privacy/moderation boundary.
  - Verify: Review module ids, dependencies, route/data contracts, six required spec areas,
    boundaries, success criteria, and open questions; `git diff --check`.
  - Files: `docs/specs/reports/README.md`, `docs/specs/reports/editing.md`,
    `docs/specs/reports/comments.md`, `docs/specs/reports/core.md`.
  - Evidence: User approved the capability split and default product rules on 2026-08-18.

- [x] Task 16: Add the extension implementation plan and task checklist
  - Acceptance: Work is sliced dependency-first into focused editing and comment increments with
    explicit checkpoints, risks, verification, and no task larger than five implementation files.
  - Verify: Review dependency graph, file scopes, acceptance criteria, checkpoints, and boundaries;
    `git diff --check`.
  - Files: `tasks/plan.md`, `tasks/todo.md`.
  - Evidence: The approved modules remain independent and are ordered sequentially only because
    they share the post controller/detail surface.

- [x] Task 17: Prove report-editing validation and owner-scoped persistence
  - Acceptance: Edit input uses the complete report contract; an owner can load and update a
    published or legacy report; protected fields survive; non-owner, hidden, and missing targets
    cannot be read privately or updated; public projections remain address-free.
  - Verify: `pnpm test -- app/actions/post/report-input.test.ts app/data/reports.test.ts`;
    `pnpm typecheck`; `git diff --check`.
  - Files: `app/actions/post/report-input.ts`, `app/actions/post/report-input.test.ts`,
    `app/data/reports.ts`, `app/data/reports.test.ts`.
  - Evidence: The focused RED test failed on the missing update parser and owner-scoped data
    operations. The GREEN implementation reuses the complete report schema, restricts private
    reads and atomic updates by id/author/status, allowlists editable fields, preserves protected
    state and existing confirmation, completes legacy confirmation, and leaves public projections
    address-free. All 28 focused tests and `pnpm typecheck` passed; `git diff --check` is clean.

- [x] Task 18: Ship the authorized native report edit/update flow
  - Acceptance: An owner gets a prefilled accessible form and can submit native
    `POST + _method=PUT`; guests redirect; non-owner/hidden/missing targets return the standard
    `404`; CSRF and validation failures write nothing; success redirects `303` to public detail.
  - Verify: `pnpm test -- app/actions/post/controller.test.tsx`; `pnpm typecheck`; `pnpm build`;
    `git diff --check`.
  - Files: `app/router.ts`, `app/actions/post/controller.tsx`,
    `app/actions/post/edit-report.tsx`, `app/actions/post/public/report-form.tsx`,
    `app/actions/post/controller.test.tsx`.
  - Evidence: Three RED controller tests first observed the edit placeholder `404` and missing CSRF
    form. The GREEN flow adds form-data method override before CSRF, an owner-only prefilled edit
    page, shared create/edit form states, standard `404` responses for non-owner/hidden/missing
    targets, linked `422` validation, protected-field allowlisting, and a `303` detail redirect.
    All 13 controller tests, `pnpm typecheck`, `pnpm build`, task-scoped Oxlint/Oxfmt checks, and
    `git diff --check` passed.

- [x] Task 19: Prove comment validation and public/trusted persistence
  - Acceptance: Comment content trims to 1–1,000 characters; writes derive protected fields;
    public reads are stably ordered and report-scoped with only content/date/username; hidden or
    missing report writes and reads expose nothing.
  - Verify: `pnpm test -- app/actions/post/comment-input.test.ts app/data/comments.test.ts`;
    `pnpm typecheck`; `git diff --check`.
  - Files: `app/actions/post/comment-input.ts`, `app/actions/post/comment-input.test.ts`,
    `app/data/comments.ts`, `app/data/comments.test.ts`, `test/reports.ts`.
  - Evidence: RED tests first failed on the absent comment input and data modules. GREEN adds a
    trimmed 1–1,000 character form schema with bounded safe redisplay, transactional trusted
    creation after a published-report lookup, and a parameterized public projection ordered by
    creation time/id. Hidden, missing, hostile-id, other-report, address, user-id, email, and
    password cases expose nothing. All 8 focused tests, `pnpm typecheck`, task-scoped
    Oxlint/Oxfmt checks, and `git diff --check` passed.

- [x] Task 20: Ship public report comments and authenticated native creation
  - Acceptance: Detail renders an escaped ordered list or meaningful empty state; guests receive a
    safe login prompt; authenticated users receive a CSRF form; invalid input re-renders linked
    `422` errors; valid input redirects `303`; hidden/missing reports share `404`.
  - Verify: `pnpm test -- app/actions/post/controller.test.tsx`; `pnpm typecheck`; `pnpm build`;
    `pnpm exec remix routes`; `git diff --check`.
  - Files: `app/routes.ts`, `app/actions/post/controller.tsx`,
    `app/actions/post/report-detail.tsx`, `app/actions/post/report-comments.tsx`,
    `app/actions/post/controller.test.tsx`.
  - Evidence: Six RED outcomes first showed the missing nested route and absent detail UI/action.
    GREEN adds `POST /posts/:id/comments`, public escaped lists and empty state, a safe guest login
    path, authenticated CSRF form, author-only edit discovery, linked bounded `422` responses,
    indistinguishable hidden/missing `404`, trusted creation, and `303` redirect. All 18 controller
    tests, `pnpm typecheck`, `pnpm build`, `pnpm exec remix routes`, task-scoped Oxlint/Oxfmt
    checks, and `git diff --check` passed.

- [x] Task 21: Run the report-interactions quality and browser gate
  - Acceptance: Both module success criteria have evidence; editing/comments work without
    JavaScript and by keyboard at 320/768/1024/1440 px; console/network are clean; the final diff
    contains no secret, private-field leak, dependency change, unrelated edit, or deferred feature;
    the only schema artifact is the reviewed additive comment-feed index.
  - Verify: `pnpm build`; `pnpm test`; `pnpm typecheck`; `pnpm exec oxlint .`;
    `pnpm exec oxfmt --check .`; `pnpm exec remix routes`; `pnpm exec remix doctor`;
    `pnpm audit`; `git diff --check`; browser journey and complete diff review.
  - Files: `tasks/todo.md` (evidence only; split discovered defects before changing product files).
  - Evidence: The current gate passes `pnpm build`, 74 server tests, three Chromium component
    tests, two Chromium end-to-end tests, `pnpm typecheck`, repository-wide Oxlint, changed-file
    Oxfmt, `pnpm exec remix routes`, `pnpm exec remix doctor`, and `git diff --check`. Independent
    review found and the implementation now covers private
    `no-store`/`Vary: Cookie` edit responses, 50-row keyset comment pages backed by
    `Comment(postId, createdAt, id)`, PUT authorization denial, and legacy editing. A real isolated
    Playwright journey covered registration, authenticated edit, category changes with untouched
    fields, escaped comment creation, logout/back-cache behavior, guest login return, and native
    edit plus comment submissions with browser JavaScript disabled. Edit/detail/comment layouts
    had exact viewport-width documents at 320/768/1024/1440 px; inspected mobile/desktop screenshots
    were readable; normal-mode console reported 0 errors and 0 warnings; application requests
    completed successfully. Generated browser artifacts were moved outside the worktree. Dependency
    audit is the sole external blocker: the configured registry proxy returned HTTP 405 because it
    is read-only, and npm's official advisory endpoint repeatedly reset the approved network
    connection. No dependency changed.
