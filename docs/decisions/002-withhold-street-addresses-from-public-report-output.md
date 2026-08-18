# ADR-002: Withhold Street Addresses from Public Report Output

## Status

Accepted

## Date

2026-08-17

## Context

The renter-report contract requires a building-level street address so a submitted report can be
identified internally. The initial product direction also exposed that address beside the author's
public username and made it searchable.

Before the first report slice was completed, the product decision changed: public readers need
city/region context, but they should not receive the stored street address. Removing the text only
from visible cards would be insufficient because the address could still leak through detail
queries, server-rendered page state, client props, or address-only search results.

ADR-001 remains in force: report data stays in the existing `Post` table and route family. This ADR
sets the public projection boundary for its location fields.

## Decision

Continue validating and storing the dedicated building-level street address without apartment or
unit details. Treat that field as internal data.

Every public list and detail query must use an allowlisted projection that omits `Post.address`.
Public search must not inspect the address column, and public serializers and presentation types
must not accept an address field. City and region are the only structured location fields shown in
the feed or report detail page.

The report form must disclose that the street address is stored but not shown publicly, and must
identify city/region and the public username among the published fields.

## Alternatives Considered

### Publish the Building-Level Address

- Benefit: readers could distinguish individual buildings and search exact addresses.
- Cost: it publicly links a renter's username to a precise location and creates an unnecessary
  disclosure surface.
- Rejected: city/region is the approved public location boundary.

### Stop Collecting the Street Address

- Benefit: the system would not retain the more precise location at all.
- Cost: it removes the existing internal report-identification field and changes the approved
  creation/storage contract beyond the requested public-boundary correction.
- Not selected: this remains a possible future data-minimization decision with its own migration,
  retention, and operational analysis.

### Select the Address and Hide It Only in the UI

- Benefit: minimal query changes.
- Cost: the value would still cross the public data boundary and could leak through serialized
  props, future components, debugging output, or search behavior.
- Rejected: privacy enforcement belongs at the query allowlist, before rendering.

## Consequences

- Public feed and detail responses expose city/region, never the dedicated street-address field.
- Exact-address discovery is unavailable; reports in the same city/region may be ambiguous until a
  separately approved privacy-preserving property model exists.
- The stored address remains sensitive internal data and must be covered by access control,
  retention, export, and deletion procedures.
- Regression tests seed unique street markers and prove they are absent from public projections,
  searches, and HTML.
- Making street addresses public later requires an explicit replacement decision and privacy
  review.
