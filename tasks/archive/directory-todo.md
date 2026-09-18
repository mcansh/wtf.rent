# Public Directory Page Task Checklist

Approved contract: [`docs/specs/public-pages/directory.md`](../../docs/specs/public-pages/directory.md)

Approved implementation plan: [`directory-plan.md`](./directory-plan.md)

- [x] Task 1: Define and test directory URL input
  - Acceptance: `q` trims and caps at 100 characters; `%`, `_`, and `!` become literal `LIKE`
    input; missing, invalid, fractional, non-positive, and unsafe integer pages normalize to one;
    positive safe integers remain unchanged.
  - Verify: `pnpm test -- app/actions/directory/input.test.ts`; `pnpm typecheck`;
    `git diff --check`.
  - Files: `app/actions/directory/input.ts`, `app/actions/directory/input.test.ts`.
  - Evidence: The focused RED test first failed because the route-owned parser did not exist. The
    minimal wrapper now inherits the established trim, 100-character cap, literal `%`/`_`/`!`
    escaping, and positive safe-integer page rules. All three focused cases and `pnpm typecheck`
    pass; no new normalization logic was duplicated.

- [x] Task 2: Implement and test the public directory query
  - Acceptance: The operation returns deterministic 24-entry pages containing only nonblank
    landlord/manager name, nullable city/region, and public report count; list and count share the
    same published/search predicate; hidden rows, blank names, private columns, and literal wildcard
    false matches are excluded; PostgreSQL intent remains parameterized and equivalent to SQLite.
  - Verify: `pnpm test -- app/data/directory.test.ts`; `pnpm typecheck`; inspect recorded SQL;
    `git diff --check`.
  - Files: `app/data/directory.ts`, `app/data/directory.test.ts`, `test/reports.ts` only if an
    additional fixture helper is required.
  - Evidence: The focused RED test first failed because the directory operation did not exist. The
    implementation now groups only published reports with nonblank landlord names by landlord,
    city, and region; returns only those public fields plus aggregate counts; applies the same
    escaped search predicate to list and count queries; and paginates deterministically in groups of 24. Four focused SQLite/PostgreSQL tests, `pnpm typecheck`, and targeted formatting checks pass.

- [x] Task 3: Render and test the complete directory route
  - Acceptance: `/directory` returns `200` with current navigation, native search, real aggregate
    entries, report-feed links, result copy, preserved-query pagination, and distinct all-empty,
    no-match, and out-of-range states; address/account markers never appear in HTML.
  - Verify: `pnpm test -- app/actions/controller.test.tsx`; `pnpm build`; `pnpm typecheck`;
    `git diff --check`.
  - Files: `app/actions/controller.tsx`, `app/actions/controller.test.tsx`,
    `app/actions/directory/page.tsx`.
  - Evidence: Four controller tests first failed against the placeholder `404`. The route now parses
    native URL state, runs the public aggregate operation, and renders a semantic, responsive page
    with current navigation, city/region-only cards, report-feed links, preserved-query pagination,
    and distinct empty states. All 17 controller tests, `pnpm build`, `pnpm typecheck`, targeted
    lint, and targeted formatting checks pass; unique address/account/hidden-row markers are absent
    from rendered HTML.

- [x] Task 4: Complete UI, regression, and publication verification
  - Acceptance: The page has valid landmarks/headings/form/list/navigation, works by keyboard,
    causes no console errors or horizontal overflow, and remains legible at 320, 768, 1024, and
    1440 CSS pixels; full repository checks pass; one focused signed-off commit is published as a
    draft PR based on `logan/codex-search-autocomplete`.
  - Verify: `pnpm test`; `pnpm typecheck`; `pnpm build`; `pnpm exec oxlint .`;
    `pnpm exec oxfmt --check .`; `pnpm exec remix routes`; `pnpm exec remix doctor`;
    `git diff --check`; real-browser responsive and keyboard inspection; remote PR base/head check.
  - Files: `tasks/directory-todo.md` for evidence plus only implementation files requiring a
    verified UI correction.
  - Evidence: The full 100-test suite, typecheck, build, Oxlint, route listing, Remix Doctor, and
    diff checks pass. The committed tree passes Oxfmt; an unrelated live edit in
    `app/actions/post/controller.tsx` remains unstaged. Isolated-browser checks at 320, 768, 1024,
    and 1440 CSS pixels confirmed semantic landmarks and headings, native search and pagination,
    keyboard-operable mobile navigation, zero horizontal overflow, zero console errors, and only
    successful document/asset responses. The two signed-off Conventional Commits are scoped to the
    approved request-context refactor and Directory feature for the draft stacked PR.
