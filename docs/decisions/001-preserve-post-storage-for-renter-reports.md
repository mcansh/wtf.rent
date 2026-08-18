# ADR-001: Preserve Post Storage for Renter Reports

## Status

Accepted

## Date

2026-08-17

## Context

wtf.rent is changing its user-facing concept from generic posts to structured renter reports. The
existing PostgreSQL schema already stores `Post` rows, `Comment` rows reference those post ids, and
the typed route contract exposes a `/posts` resource. Replacing or renaming that storage now would
make the first report slice destructive and would complicate compatibility with databases created
by earlier migrations.

The product still needs report-specific fields for internal address identification and public
landlord discovery, rating, category, firsthand confirmation, and visibility. ADR-002 defines the
street address as internal-only while city/region remains public.

## Decision

Keep the `Post` table, its primary keys, its author relationship, its comment relationship, and the
`/posts` route family. Add report-specific columns through an additive migration and call the
records **reports** in user-facing copy.

Report-specific columns other than status remain nullable at the database layer so existing rows
remain valid. New application writes validate and require the complete report contract. Existing
rows render without fabricated metadata.

## Alternatives Considered

### Rename Post to Report

- Benefit: product and storage terminology match.
- Cost: table, constraint, relation, migration, test-fixture, and route changes add risk without
  improving the first renter workflow.
- Rejected: the rename is reversible later and is not worth combining with the behavior change.

### Create a Separate Report Table

- Benefit: a clean, purpose-built schema with no nullable legacy columns.
- Cost: duplicates the content model, strands existing posts/comments, and requires a separate data
  migration or two competing public content paths.
- Rejected: there is one product concept, not two independent resources.

### Replace Existing Rows During Migration

- Benefit: every stored row would satisfy the new report contract.
- Cost: missing addresses, ratings, landlords, and categories would have to be invented or existing
  rows discarded.
- Rejected: fabricated rental data and destructive migration are both unacceptable.

## Consequences

- Existing post ids and comments survive the report rollout.
- Public URLs remain stable.
- Product code must translate internal `Post` terminology to report copy at the UI boundary.
- Report-specific fields are nullable for legacy rows, while new writes enforce stronger
  application invariants.
- A future rename remains possible as a dedicated migration after legacy data has been completed or
  retired.
