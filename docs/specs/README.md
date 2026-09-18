# Product Specifications

Specifications are versioned product contracts. They describe user-visible behavior, durable
privacy and security invariants, boundaries, and testable acceptance criteria.

## Capability Index

| Capability                 | Status      | Specification                                | Canonical verification                                                          |
| -------------------------- | ----------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| Credentials authentication | Implemented | [auth.md](./auth.md)                         | `app/actions/login/controller.test.tsx`, `app/actions/join/controller.test.tsx` |
| Renter reports             | Implemented | [reports/core.md](./reports/core.md)         | `app/actions/post/controller.test.tsx`, `app/data/reports.test.ts`              |
| Report editing             | Implemented | [reports/editing.md](./reports/editing.md)   | `app/actions/post/controller.test.tsx`, `app/data/reports.test.ts`              |
| Report comments            | Implemented | [reports/comments.md](./reports/comments.md) | `app/actions/post/controller.test.tsx`, `app/data/comments.test.ts`             |
| Public pages               | Implemented | [public-pages/](./public-pages/)             | `app/actions/controller.test.tsx`                                               |

## Lifecycle

- **Draft**: under discussion; not an implementation contract.
- **Approved**: the contract for planned work.
- **Implemented**: the current behavior contract; update it with behavior changes.
- **Superseded**: retained for history and linked to its replacement.

When a behavior change lands, the same pull request updates the relevant specification and canonical
tests, or marks the specification superseded. Tests are the executable proof; a mismatch is resolved
deliberately rather than silently treating either document or code as automatically correct.

Keep delivery plans and checklists in `tasks/` while work is active. Keep technical rationale in
[`docs/decisions/`](../decisions/).
