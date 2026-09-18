# Public Directory Page Implementation Plan

Status: Approved on 2026-08-18

Approved contract: [`docs/specs/public-pages/directory.md`](../../docs/specs/public-pages/directory.md)

Stack base: `logan/codex-search-autocomplete` / draft PR #24

Target branch: `logan/codex-directory-page`

## Dependency Map

| Component            | Responsibility                                                                   | Depends on              |
| -------------------- | -------------------------------------------------------------------------------- | ----------------------- |
| Directory input      | Normalize bounded `q` and positive `page`; escape literal SQL wildcard input     | Approved URL contract   |
| Directory data query | Return allowlisted public landlord/location aggregates with stable pagination    | Directory input         |
| Directory route      | Read URL input, call the context-owned data operation, and return server HTML    | Input and data query    |
| Directory page       | Render search, result count, entries, pagination, and honest empty states        | Route response contract |
| Verification         | Prove HTTP behavior, data privacy, SQL parity, accessibility, and responsiveness | All implementation      |

## Implementation Order

### 1. Establish the directory input and data contract

- Add a route-owned parser for `q` and `page` with the approved 100-character cap, positive-page
  normalization, and `LIKE` escaping.
- Define `PublicDirectoryEntry` and `PublicDirectoryPage` with only landlord/manager name, nullable
  city/region, report count, and page metadata.
- Add the fixed 24-entry page size and a stable offset helper.

Checkpoint: pure input tests establish the boundary before any SQL or page code uses it.

### 2. Implement the privacy-safe aggregate query

- Select only landlord/manager name, city, region, and `count(*)` from `PUBLISHED` reports whose
  landlord/manager is nonblank.
- Apply the same bound search predicate to name, city, and region with parameterized values and an
  explicit literal escape character.
- Group by the directory unit, order case-insensitively by name/location with deterministic null
  handling, and apply the fixed limit/offset.
- Count grouped rows through a matching subquery so pagination metadata reflects the same filter.
- Parse both result sets at runtime and fail if the count contract is malformed.

Checkpoint: SQLite data tests cover visibility, projections, search, ordering, counts, pagination,
and literal wildcard input; a PostgreSQL recorder proves equivalent parameterized intent.

### 3. Replace the route placeholder with the server-rendered page

- Update the existing top-level `directory` handler; the route map itself does not change.
- Have the directory and existing report data operations read the request-scoped database through
  Remix async context so route callers pass only their domain input.
- Add a semantic native GET search form targeting `/directory` and preserve the current query.
- Render one list item per returned landlord/location entry with its public report count and a link
  to the existing home feed filtered by landlord/manager name.
- Render truthful all-empty, search-empty, and out-of-range states.
- Add previous/next navigation that preserves `q` and omits `page=1`.
- Match the existing paper/ink/acid/coral/blue design language without introducing hydration.

Checkpoint: root controller tests prove status, current navigation, real data, private-data absence,
search, pagination URLs, and every empty state.

### 4. Verify and publish the first stacked PR

- Run the focused tests during implementation, then the full test, typecheck, build, lint, format,
  route, Doctor, and diff checks.
- Run a real-browser pass at 320, 768, 1024, and 1440 CSS pixels; verify keyboard navigation,
  heading/landmark/form structure, no horizontal overflow, and a clean console.
- Review the branch diff and staged secret scan, create focused signed-off conventional commits,
  publish `logan/codex-directory-page`, and open a draft PR based on
  `logan/codex-search-autocomplete`.

Checkpoint: the remote PR diff contains only the approved directory capability, its spec/plan, and
the approved request-context data-operation refactor.

## Parallelization

Implementation stays sequential. Input types feed the data function; the data result feeds the page;
controller and data tests share the same fixtures; and publishing must happen after verification.
Browser inspection can run alongside final static checks once the server implementation is stable.

## Risks and Mitigations

| Risk                                                       | Mitigation                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Aggregates disclose stored or account-private data         | Explicit four-field SQL projection plus unique-marker query/result/HTML assertions          |
| Hidden reports influence directory rows or counts          | One shared `PUBLISHED` and nonblank-landlord predicate for list and grouped count           |
| Search totals diverge from displayed rows                  | Reuse one SQL predicate and cover filtered count/page boundaries with real SQLite execution |
| Same names imply one organization across different regions | Keep city/region in the grouping key and document that entity merging is out of scope       |
| Large directories create slow or unbounded responses       | Bound input, fixed page size, stable order, grouped count, and parameterized limit/offset   |
| Stack history diverges between local Git and remote GitHub | Create the remote branch from PR #24's verified head and update only by fast-forward        |

## Rollback

Revert the directory feature commit and, if the request-context change must also be removed, its
preceding refactor commit. No schema, dependency, environment, external-service, or stored-data
cleanup is required; reverting the feature returns `/directory` to the standard placeholder.
