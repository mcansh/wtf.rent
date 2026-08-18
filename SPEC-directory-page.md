# Spec: Public Directory Page

Status: Approved on 2026-08-18

## Objective

Replace the `/directory` placeholder with a server-rendered directory of landlords and property
managers represented in published renter reports. A visitor can browse or search exact public
directory entries by name, city, or region and continue to the matching report feed without seeing
stored street addresses, hidden reports, account details, or fabricated records.

The initial directory unit is one normalized landlord/manager plus city/region grouping. This keeps
location useful at the already-approved public granularity and avoids implying that similarly named
organizations in different regions are the same entity.

## Tech Stack

- Remix 3.0.0 beta route/controller and server-rendered `remix/ui` components
- TypeScript 7
- Remix Data Table SQL for PostgreSQL production and SQLite test parity
- Tailwind CSS 4 using the existing paper/ink/acid/coral/blue visual system
- Node test runner through the repository's `pnpm test` script

## Commands

- Build: `pnpm build`
- Test: `pnpm test`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm exec oxlint .`
- Format check: `pnpm exec oxfmt --check .`
- Remix checks: `pnpm exec remix routes && pnpm exec remix doctor`
- Development: `pnpm dev`

## Project Structure

- `app/routes.ts` — keep `/directory` as the typed public route.
- `app/actions/controller.tsx` — parse the request, call the data operation, and render the page.
- `app/actions/directory/input.ts` — bound and normalize `q` and `page` URL input.
- `app/actions/directory/page.tsx` — route-owned semantic directory presentation.
- `app/data/directory.ts` — parameterized public aggregate query and pagination metadata.
- `app/data/directory.test.ts` — query, privacy, search, ordering, and pagination coverage.
- `app/actions/controller.test.tsx` — complete route-to-HTML behavior and privacy coverage.

## Code Style

Keep the server route authoritative and pass only validated, serializable public data into the page:

```tsx
directory: {
  async handler(context) {
    let input = parseDirectoryInput(context.url.searchParams)
    let directoryPage = await listPublicDirectoryEntries(input)

    return context.render(
      <DocumentWithShell>
        <DirectoryPage input={input} directoryPage={directoryPage} />
      </DocumentWithShell>,
    )
  },
},
```

Use route-generated links, semantic headings/forms/lists/navigation, mobile-first Tailwind classes,
and existing color/type/spacing conventions. Do not add hydration unless browser-only behavior is
required; the initial directory search and pagination work as native GET navigation. Data
operations obtain the request-scoped database through `getContext()` rather than accepting it from
route callers.

## Testing Strategy

- Data tests run the real query against isolated in-memory SQLite fixtures.
- A PostgreSQL recorder proves parameterized equivalent query intent and absence of private columns.
- Controller tests prove default, search, empty, hidden-row, legacy-null, and pagination behavior.
- Privacy assertions use unique address/email/password markers and confirm none enter query results
  or rendered HTML.
- Browser verification covers keyboard navigation, a clean console, and layouts at 320, 768, 1024,
  and 1440 CSS pixels.

## Boundaries

- Always: include only `PUBLISHED` reports with a nonblank landlord/manager name; expose only name,
  city, region, and report count; validate and bind all query input; provide honest empty states.
- Always: cap `q` at 100 characters, escape literal SQL wildcard characters, use a fixed 24-entry
  page, and preserve search across native pagination links.
- Ask first: add a migration, dependency, external search/geocoding provider, moderation workflow,
  or organization-identity merge rule.
- Never: select, search, serialize, or render street addresses, report prose, account data, hidden
  reports, mock directory entries, or inferred organization relationships.

## Success Criteria

- `GET /directory` returns `200`, marks Directory as the current nav item, and renders real public
  landlord/manager plus city/region entries ordered deterministically.
- Each entry shows its matching public report count and links to the existing report feed filtered
  by that landlord/manager name.
- A bounded `q` searches landlord/manager name, city, and region case-insensitively while treating
  `%`, `_`, and `!` literally.
- Twenty-four entries render per page; previous/next links preserve `q`, omit redundant `page=1`,
  and out-of-range pages remain truthful.
- Blank datasets and no-match searches render distinct actionable empty states without fake data.
- Hidden reports and entries without a nonblank landlord/manager never contribute to rows or counts.
- Stored street addresses and private account fields are absent from SQL projections, return values,
  serialized props, and final HTML.
- Full tests, typecheck, build, lint, format, Remix checks, and responsive browser verification pass.

## Open Questions

None. Entity merging, dedicated landlord detail routes, map/geocoder integration, and local resource
cross-linking remain separate future capabilities.
