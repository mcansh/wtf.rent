# Report Capabilities

The renter-report core in [`core.md`](./core.md) provides authenticated
creation, public discovery, and public detail pages. This extension adds two independently
testable capabilities without changing the core report storage or privacy contract.

| Module id         | Responsibility                                                                  | Depends on                   |
| ----------------- | ------------------------------------------------------------------------------- | ---------------------------- |
| `report-editing`  | Let an authenticated author edit their own published report                     | [editing.md](./editing.md)   |
| `report-comments` | Show public report comments and let authenticated users add plain-text comments | [comments.md](./comments.md) |

Status: all three report capabilities are implemented.

The modules do not depend on each other. Editing completed the existing `resources('/posts')`
contract; comments extend the shared report-detail page.

Deferred from the editing and comments capabilities: report deletion, comment replies, comment
editing/deletion, reactions, notifications, rate limiting, and moderation UI.
