# Capability Map: Report Interactions

The renter-report core in [`SPEC-reports.md`](./SPEC-reports.md) already provides authenticated
creation, public discovery, and public detail pages. This extension adds two independently
testable capabilities without changing the core report storage or privacy contract.

| Module id         | Responsibility                                                               | Depends on                 |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------- |
| `report-editing`  | Let an authenticated author edit their own published report                  | Existing renter-report core |
| `report-comments` | Show public report comments and let authenticated users add plain-text comments | Existing renter-report core |

Build order: renter-report core (complete) → `report-editing` → `report-comments`.

The modules do not depend on each other. Editing is built first because it completes the existing
`resources('/posts')` contract; comments follow because they extend the shared report-detail page.

Approved on 2026-08-18. Deferred from both modules: report deletion, comment replies,
comment editing/deletion, reactions, notifications, rate limiting, and moderation UI.
