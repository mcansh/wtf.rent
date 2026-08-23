# ADR-004: Augment Search Autocomplete with Photon

## Status

Accepted

## Date

2026-08-23

## Context

ADR-003 limited home-page autocomplete to structured values on published reports. That protected the
stored-address boundary, but it also meant new and lightly represented locations were absent from
suggestions. Product now wants geographic suggestions beyond values already stored by wtf.rent.

Photon provides search-as-you-type place results from OpenStreetMap without an API key. Its public
service permits reasonable project use, may throttle extensive use, and does not guarantee
availability. Queries sent to Photon cross a third-party boundary.

## Decision

Keep `GET /reports/suggestions?q=…` as the browser's same-origin contract. The server queries Photon
for city, locality, district, county, and state layers while querying published report metadata for
local suggestions. It validates and maps Photon GeoJSON into the existing city and region types,
interleaves those places with report-backed results, deduplicates equivalent values, and returns at
most eight suggestions.

Do not request Photon house or street layers. Stored report addresses remain outside suggestion SQL,
JSON, client state, and rendered options under ADR-002. Selecting a suggestion still submits the
native report search, which searches only public report fields.

Use a two-second provider timeout, fail soft to report-backed suggestions, coalesce identical
in-flight requests, and cache bounded query results in-process for one minute. Mark the public,
non-personalized response cacheable by shared HTTP caches. Show Photon and OpenStreetMap attribution
with the suggestion list.

## Consequences

- Renters can discover geographic search terms that are not yet represented in published reports.
- The server, rather than the browser, shares the bounded search text with Photon, so Photon sees the
  app server's network identity rather than the renter's IP address.
- Autocomplete now depends on Photon policy and availability, but native report search and local
  suggestions continue to work during provider failures.
- Shared and in-process caching reduce duplicate report aggregates and traffic to Photon's public
  service; high-volume use still requires monitoring or a self-hosted Photon instance.
- OpenStreetMap attribution becomes part of the autocomplete UI contract.
- Adding address-level provider results or searching stored street addresses still requires a
  separate privacy decision.
