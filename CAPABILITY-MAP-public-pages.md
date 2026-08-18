# Capability Map: Public Pages

Status: Approved on 2026-08-18

| Module id        | Responsibility                                                            | Depends on               |
| ---------------- | ------------------------------------------------------------------------- | ------------------------ |
| `directory-page` | Publish a privacy-safe directory derived from public renter reports       | `search-autocomplete` PR |
| `rights-page`    | Publish a sourced, jurisdiction-neutral renter-rights resource guide      | `directory-page` PR      |
| `about-page`     | Explain the product mission, publishing standards, and privacy boundaries | `rights-page` PR         |

Build and PR order: `directory-page` → `rights-page` → `about-page`.

Each module is independently testable and receives one local branch, one focused commit, and one
draft pull request whose base is the preceding branch in the stack.
