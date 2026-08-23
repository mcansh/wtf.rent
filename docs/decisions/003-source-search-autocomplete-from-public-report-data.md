# ADR-003: Source Search Autocomplete from Public Report Data

## Status

Superseded by ADR-004

## Date

2026-08-18

## Context

The home-page search needs autocomplete for cities, regions, landlords, and report categories. The
interaction should use custom wtf.rent UI, remain free to operate without a metered map provider,
and must not send renter searches to Google Maps or another third party.

ADR-002 defines the public location boundary: city and region may be public, while the stored
street address remains internal-only. The existing report feed already searches published report
fields and remains useful without JavaScript.

## Decision

Build autocomplete from the app's own published report index. A same-origin
`GET /reports/suggestions?q=…` endpoint returns at most eight typed city, region, landlord, or
category suggestions after a two-character minimum. It uses bounded, literal, parameterized
queries and never selects the street-address, title, or report-content columns.

Enhance the existing native GET search form with a custom hydrated combobox. The client debounces
requests, cancels stale work, validates the JSON response, and supports pointer, arrow-key, Enter,
and Escape interactions. If JavaScript or suggestions fail, the native form still submits any
bounded search string to the report feed.

## Alternatives Considered

### Google Maps Autocomplete

- Benefit: broad place coverage and familiar address-oriented suggestions.
- Cost: introduces a third-party dependency, credential and billing setup, vendor request sharing,
  and pressure to expose more precise location data.
- Rejected: it conflicts with the provider and privacy constraints.

### Another Hosted Geocoder or Map Provider

- Benefit: city suggestions would not depend on existing wtf.rent reports.
- Cost: still sends search input across an external boundary and adds provider availability, usage,
  policy, and rate-limit concerns.
- Rejected: the initial search experience does not require external geographic coverage.

### Embed Every Suggestion in the Home Page

- Benefit: no request after page load.
- Cost: increases every home response as the report index grows and exposes unrelated index values
  before the renter starts searching.
- Rejected: a bounded query endpoint keeps the initial document smaller and the data flow explicit.

### Suggest Report Titles and Content

- Benefit: more autocomplete matches for experience-oriented searches.
- Cost: turns renter prose into a public typeahead corpus and creates noisy, potentially sensitive
  fragments in the dropdown.
- Rejected: free-text search remains available after submission, but suggestions use structured
  public metadata only.

## Consequences

- Autocomplete has no external API key, map widget, per-request vendor cost, or cross-origin data
  transfer.
- Suggestions reflect only values represented by published reports; a new or empty deployment may
  show no suggestions while native search continues to work.
- Street addresses stay outside suggestion SQL, JSON, client state, and rendered options.
- The endpoint's response shape and relevance ordering are observable contracts and require
  additive, reviewed changes.
- Three bounded aggregate queries run after the two-character threshold; query plans should be
  measured before adding search infrastructure or indexes.
- Adding external geocoding, address autocomplete, or precise-location suggestions requires a new
  privacy and architecture decision.
