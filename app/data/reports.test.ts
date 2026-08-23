import { describe, it } from "node:test"

import * as assert from "remix/assert"
import { createPostgresDatabase } from "remix/data-table/postgres"
import type { PostgresDatabaseInput } from "remix/data-table/postgres"

import {
  createAuthenticatedReportSession,
  createReportTestApp,
  getReportCsrfForm,
  runWithReportDatabase,
  seedLegacyPost,
  seedReportUser,
  seedStructuredReport,
  TEST_REPORT_NOW,
} from "../../test/reports.ts"
import { parseReportSuggestionInput } from "../actions/home-page/suggestion-input.ts"
import { parseReportFeedInput, REPORT_CATEGORY_LABELS } from "../actions/post/report-input.ts"
import {
  createReport,
  findPublicReport,
  listPublicReports,
  listPublicReportSuggestions,
  REPORT_PAGE_SIZE,
} from "./reports.ts"
import { posts, REPORT_CATEGORIES, users } from "./schema.ts"

describe("report database test harness", () => {
  it("creates isolated in-memory databases with deterministic fixtures", async (t) => {
    let first = createReportTestApp()
    let second = createReportTestApp()
    t.after(() => first.close())
    t.after(() => second.close())

    let author = await seedReportUser(first)
    let legacy = await seedLegacyPost(first, { authorId: author.id })
    let structured = await seedStructuredReport(first, { authorId: author.id })

    assert.equal(author.id, "report-author")
    assert.equal(author.createdAt.toISOString(), TEST_REPORT_NOW.toISOString())
    assert.deepEqual(
      {
        id: legacy.id,
        address: legacy.address,
        category: legacy.category,
        rating: legacy.rating,
        status: legacy.status,
      },
      {
        id: "legacy-report",
        address: null,
        category: null,
        rating: null,
        status: "PUBLISHED",
      },
    )
    assert.deepEqual(
      {
        id: structured.id,
        address: structured.address,
        city: structured.city,
        region: structured.region,
        category: structured.category,
        rating: structured.rating,
        status: structured.status,
      },
      {
        id: "structured-report",
        address: "123 Main Street",
        city: "Detroit",
        region: "MI",
        category: "MAINTENANCE",
        rating: 4,
        status: "PUBLISHED",
      },
    )
    assert.equal((await first.database.findMany(users)).length, 1)
    assert.equal((await first.database.findMany(posts)).length, 2)
    assert.equal((await second.database.findMany(users)).length, 0)
    assert.equal((await second.database.findMany(posts)).length, 0)
  })

  it("round-trips authenticated sessions and CSRF tokens without external state", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)

    let cookie = await createAuthenticatedReportSession(app, author)
    let form = await getReportCsrfForm(app, "/", cookie)
    let formData = new FormData()
    formData.set("_csrf", form.token)

    assert.match(form.html, />Profile</)
    assert.match(form.html, /action="\/logout"/)
    assert.match(form.token, /^[A-Za-z0-9_-]+$/)

    let response = await app.router.fetch(
      new Request("http://localhost/logout", {
        method: "POST",
        headers: { Cookie: form.cookie },
        body: formData,
      }),
    )

    assert.equal(response.status, 303)
    assert.equal(response.headers.get("Location"), "/")
  })
})

describe("createReport", () => {
  it("stores validated content with only trusted ownership and publication metadata", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    await seedReportUser(app, {
      id: "forged-author",
      username: "forged-author",
      email: "forged@example.com",
    })
    let confirmedAt = new Date("2026-08-16T18:30:00.000Z")
    let forgedAt = new Date("2000-01-01T00:00:00.000Z")
    let input = {
      address: "456 Woodward Avenue",
      city: "Detroit",
      region: "MI",
      landlordName: null,
      category: "GOOD_EXPERIENCE" as const,
      rating: 5,
      title: "A solid year in this building",
      content: "Repairs were handled promptly and communication stayed clear all year.",
      authorId: "forged-author",
      experienceConfirmedAt: forgedAt,
      status: "HIDDEN",
      id: "forged-report-id",
      createdAt: forgedAt,
    }

    let report = await runWithReportDatabase(app.database, () =>
      createReport(input, {
        authorId: author.id,
        confirmedAt,
      }),
    )
    let stored = await app.database.find(posts, report.id)

    assert.ok(stored)
    assert.equal(report.id === "forged-report-id", false)
    assert.equal(report.authorId, author.id)
    assert.equal(report.status, "PUBLISHED")
    assert.equal(report.experienceConfirmedAt?.toISOString(), confirmedAt.toISOString())
    assert.equal(report.createdAt.toISOString(), TEST_REPORT_NOW.toISOString())
    assert.deepEqual(stored, report)
  })
})

describe("listPublicReports", () => {
  it("returns only allowlisted published and legacy summaries in stable newest-first order", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app, {
      email: "private-author@example.test",
      password: "private-password-hash",
    })
    let newestAt = new Date("2026-08-17T11:00:00.000Z")
    let tiedAt = new Date("2026-08-17T10:00:00.000Z")
    let legacyAt = new Date("2026-08-17T09:00:00.000Z")

    await seedStructuredReport(app, {
      id: "newest",
      authorId: author.id,
      address: "919 Private Projection Marker",
      createdAt: newestAt,
      updatedAt: newestAt,
    })
    await seedStructuredReport(app, {
      id: "tie-a",
      authorId: author.id,
      createdAt: tiedAt,
      updatedAt: tiedAt,
    })
    await seedStructuredReport(app, {
      id: "tie-b",
      authorId: author.id,
      createdAt: tiedAt,
      updatedAt: tiedAt,
    })
    await seedLegacyPost(app, {
      id: "legacy",
      authorId: author.id,
      createdAt: legacyAt,
      updatedAt: legacyAt,
    })
    await seedStructuredReport(app, {
      id: "hidden",
      authorId: author.id,
      status: "HIDDEN",
      createdAt: new Date("2026-08-17T12:00:00.000Z"),
    })

    let page = await runWithReportDatabase(app.database, () =>
      listPublicReports(validReportFeedInput(new URLSearchParams())),
    )

    assert.deepEqual(
      page.reports.map((report) => report.id),
      ["newest", "tie-b", "tie-a", "legacy"],
    )
    assert.deepEqual(
      {
        page: page.page,
        pageSize: page.pageSize,
        total: page.total,
        totalPages: page.totalPages,
        hasPreviousPage: page.hasPreviousPage,
        hasNextPage: page.hasNextPage,
      },
      {
        page: 1,
        pageSize: 20,
        total: 4,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    )
    assert.deepEqual(Object.keys(page.reports[0] ?? {}).sort(), [
      "category",
      "city",
      "content",
      "createdAt",
      "id",
      "landlordName",
      "rating",
      "region",
      "title",
      "username",
    ])
    let legacy = page.reports.find((report) => report.id === "legacy")
    assert.ok(legacy)
    assert.equal("address" in legacy, false)
    assert.equal(legacy.category, null)
    assert.equal(legacy.rating, null)
    assert.equal(JSON.stringify(page).includes("919 Private Projection Marker"), false)
    assert.equal(JSON.stringify(page).includes("private-author@example.test"), false)
    assert.equal(JSON.stringify(page).includes("private-password-hash"), false)
  })

  it("searches every approved field and category label case-insensitively", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    let fieldCases = [
      ["title", "NeedleTitle", "match-title"],
      ["content", "NeedleContent appears in this firsthand account.", "match-content"],
      ["city", "NeedleCity", "match-city"],
      ["region", "NeedleRegion", "match-region"],
      ["landlordName", "NeedleLandlord", "match-landlord"],
    ] as const

    for (let [field, value, id] of fieldCases) {
      await seedStructuredReport(app, {
        id,
        authorId: author.id,
        title: "A neutral report title",
        content: "A plain firsthand account with enough detail for this report.",
        address: "100 Plain Street",
        city: "Plainville",
        region: "PV",
        landlordName: "Plain Homes",
        category: null,
        [field]: value,
      })
    }

    for (let category of REPORT_CATEGORIES) {
      await seedStructuredReport(app, {
        id: `category-${category.toLowerCase()}`,
        authorId: author.id,
        title: "A neutral report title",
        content: "A plain firsthand account with enough detail for this report.",
        address: "100 Plain Street",
        city: "Plainville",
        region: "PV",
        landlordName: "Plain Homes",
        category,
      })
    }

    for (let [field, value, id] of fieldCases) {
      let page = await runWithReportDatabase(app.database, () =>
        listPublicReports(validReportFeedInput(new URLSearchParams({ q: value.toUpperCase() }))),
      )
      assert.deepEqual(
        page.reports.map((report) => report.id),
        [id],
        field,
      )
      assert.equal(page.total, 1, field)
    }

    for (let category of REPORT_CATEGORIES) {
      let page = await runWithReportDatabase(app.database, () =>
        listPublicReports(
          validReportFeedInput(
            new URLSearchParams({ q: REPORT_CATEGORY_LABELS[category].toUpperCase() }),
          ),
        ),
      )
      assert.deepEqual(
        page.reports.map((report) => report.id),
        [`category-${category.toLowerCase()}`],
        category,
      )
      assert.equal(page.total, 1, category)
    }
  })

  it("never searches the stored street address", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    await seedStructuredReport(app, {
      id: "private-address-only",
      authorId: author.id,
      address: "77 NeedleAddress Road",
      title: "A neutral report title",
      content: "A plain firsthand account with enough detail for this report.",
      city: "Plainville",
      region: "PV",
      landlordName: "Plain Homes",
      category: null,
    })

    let page = await runWithReportDatabase(app.database, () =>
      listPublicReports(validReportFeedInput(new URLSearchParams({ q: "NEEDLEADDRESS" }))),
    )

    assert.deepEqual(page.reports, [])
    assert.equal(page.total, 0)
  })

  it("treats LIKE metacharacters as literal search text", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)

    await seedStructuredReport(app, {
      id: "literal-match",
      authorId: author.id,
      title: "The advertised 50%_off! fee never existed",
    })
    await seedStructuredReport(app, {
      id: "wildcard-lookalike",
      authorId: author.id,
      title: "The advertised 50XXoff! fee never existed",
    })

    let page = await runWithReportDatabase(app.database, () =>
      listPublicReports(validReportFeedInput(new URLSearchParams({ q: "50%_OFF!" }))),
    )

    assert.deepEqual(
      page.reports.map((report) => report.id),
      ["literal-match"],
    )
    assert.equal(page.total, 1)
  })

  it("uses a fixed 20-row page with matching totals and stable page boundaries", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)

    for (let index = 0; index < 23; index++) {
      await seedStructuredReport(app, {
        id: `page-${index.toString().padStart(2, "0")}`,
        authorId: author.id,
      })
    }

    let [first, second] = await runWithReportDatabase(app.database, () =>
      Promise.all([
        listPublicReports(validReportFeedInput(new URLSearchParams({ page: "1" }))),
        listPublicReports(validReportFeedInput(new URLSearchParams({ page: "2" }))),
      ]),
    )

    assert.equal(REPORT_PAGE_SIZE, 20)
    assert.equal(first.reports.length, 20)
    assert.equal(second.reports.length, 3)
    assert.equal(first.total, 23)
    assert.equal(second.total, 23)
    assert.equal(first.totalPages, 2)
    assert.equal(first.hasPreviousPage, false)
    assert.equal(first.hasNextPage, true)
    assert.equal(second.hasPreviousPage, true)
    assert.equal(second.hasNextPage, false)
    assert.deepEqual(
      second.reports.map((report) => report.id),
      ["page-02", "page-01", "page-00"],
    )
    assert.equal(
      first.reports.some((report) => second.reports.some((other) => other.id === report.id)),
      false,
    )
  })

  it("filters by proximity radius when lat/lng are provided", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)

    // Detroit, MI — within 50 miles of the search origin
    await seedStructuredReport(app, {
      id: "nearby",
      authorId: author.id,
      city: "Detroit",
      region: "MI",
      latitude: 42.3314,
      longitude: -83.0458,
    })
    // New York, NY — ~508 miles away
    await seedStructuredReport(app, {
      id: "distant",
      authorId: author.id,
      city: "New York",
      region: "NY",
      latitude: 40.7128,
      longitude: -74.006,
    })
    // No coordinates — excluded from proximity results
    await seedStructuredReport(app, {
      id: "no-coords",
      authorId: author.id,
      city: "Anywhere",
      region: "ZZ",
    })

    let withinFifty = await runWithReportDatabase(app.database, () =>
      listPublicReports(
        validReportFeedInput(
          new URLSearchParams({ radius: "50", lat: "42.3314", lng: "-83.0458" }),
        ),
      ),
    )
    let anyDistance = await runWithReportDatabase(app.database, () =>
      listPublicReports(validReportFeedInput(new URLSearchParams())),
    )

    assert.deepEqual(
      withinFifty.reports.map((r) => r.id),
      ["nearby"],
    )
    assert.equal(withinFifty.total, 1)
    assert.equal(anyDistance.total, 3)
  })

  it("compiles equivalent parameterized PostgreSQL join, search, count, order, and page intent", async () => {
    let recorder = new ReportPostgresQueryRecorder()
    // SAFETY: The Postgres adapter accepts query-compatible clients structurally at runtime; this
    // recorder implements the exact query call and result fields exercised by listPublicReports.
    let database = createPostgresDatabase(recorder as PostgresDatabaseInput)
    let input = validReportFeedInput(new URLSearchParams({ q: "50%_OFF!", page: "2" }))

    let page = await runWithReportDatabase(database, () => listPublicReports(input))

    assert.equal(page.total, 0)
    assert.equal(recorder.queries.length, 2)
    let rowsQuery = recorder.queries.find((query) => query.text.includes("order by"))
    let countQuery = recorder.queries.find((query) => query.text.includes("count(*)"))
    assert.ok(rowsQuery)
    assert.ok(countQuery)
    assert.match(rowsQuery.text, /inner join "User"/)
    assert.match(rowsQuery.text, /escape '!'/)
    assert.match(rowsQuery.text, /order by p\."createdAt" desc, p\."id" desc/)
    assert.match(rowsQuery.text, /limit \$8\s+offset \$9/)
    assert.doesNotMatch(rowsQuery.text, /\?/)
    assert.doesNotMatch(rowsQuery.text, /p\."address"|"email"|"password"/)
    assert.deepEqual(rowsQuery.values, [
      "PUBLISHED",
      ...Array<string>(6).fill(input.likePattern ?? ""),
      20,
      20,
    ])
    assert.match(countQuery.text, /inner join "User"/)
    assert.match(countQuery.text, /escape '!'/)
    assert.doesNotMatch(countQuery.text, /p\."address"/)
    assert.doesNotMatch(countQuery.text, /order by|limit|offset/)
    assert.deepEqual(countQuery.values, [
      "PUBLISHED",
      ...Array<string>(6).fill(input.likePattern ?? ""),
    ])
  })
})

describe("listPublicReportSuggestions", () => {
  it("ranks and deduplicates public city, region, landlord, and category values", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)

    for (let index = 0; index < 2; index++) {
      await seedStructuredReport(app, {
        id: `detroit-${index}`,
        authorId: author.id,
        city: "Detroit",
        region: "MI",
        landlordName: "Maple Management",
        category: "MAINTENANCE",
      })
    }
    await seedStructuredReport(app, {
      id: "midland",
      authorId: author.id,
      city: "Midland",
      region: "MI",
      landlordName: "Detroit Rentals",
      category: "GOOD_EXPERIENCE",
    })

    let [detroit, maintenance, region] = await runWithReportDatabase(app.database, () =>
      Promise.all([
        listPublicReportSuggestions(validReportSuggestionInput(new URLSearchParams({ q: "det" }))),
        listPublicReportSuggestions(validReportSuggestionInput(new URLSearchParams({ q: "ma" }))),
        listPublicReportSuggestions(validReportSuggestionInput(new URLSearchParams({ q: "mi" }))),
      ]),
    )

    assert.deepEqual(detroit, [
      { kind: "city", label: "Detroit", description: "City · MI", value: "Detroit" },
      {
        kind: "landlord",
        label: "Detroit Rentals",
        description: "Landlord or manager",
        value: "Detroit Rentals",
      },
    ])
    assert.deepEqual(maintenance, [
      {
        kind: "landlord",
        label: "Maple Management",
        description: "Landlord or manager",
        value: "Maple Management",
      },
      {
        kind: "category",
        label: "Maintenance",
        description: "Report category",
        value: "Maintenance",
      },
    ])
    assert.deepEqual(region[0], {
      kind: "region",
      label: "MI",
      description: "Region",
      value: "MI",
    })
    assert.equal(region.filter((suggestion) => suggestion.kind === "region").length, 1)
  })

  it("excludes street addresses, report prose, and hidden records", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    await seedStructuredReport(app, {
      id: "private-autocomplete-source",
      authorId: author.id,
      address: "77 Secret Needle Road",
      title: "Secret Needle title",
      content: "Secret Needle content with enough detail for this public report.",
      city: "Detroit",
      region: "MI",
      landlordName: "Maple Homes",
    })
    await seedStructuredReport(app, {
      id: "hidden-autocomplete-source",
      authorId: author.id,
      status: "HIDDEN",
      city: "Secretville",
      region: "ZZ",
      landlordName: "Secret Needle Homes",
      category: "SAFETY",
    })

    let suggestions = await runWithReportDatabase(app.database, () =>
      listPublicReportSuggestions(
        validReportSuggestionInput(new URLSearchParams({ q: "secret needle" })),
      ),
    )

    assert.deepEqual(suggestions, [])
    assert.equal(JSON.stringify(suggestions).includes("77 Secret Needle Road"), false)
  })

  it("returns at most eight suggestions", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)

    for (let index = 0; index < 12; index++) {
      await seedStructuredReport(app, {
        id: `park-${index}`,
        authorId: author.id,
        landlordName: `Park ${String(index).padStart(2, "0")} Management`,
      })
    }

    let suggestions = await runWithReportDatabase(app.database, () =>
      listPublicReportSuggestions(validReportSuggestionInput(new URLSearchParams({ q: "park" }))),
    )

    assert.equal(suggestions.length, 8)
  })

  it("keeps low-frequency exact locations and landlords ahead of full prefix windows", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)

    await seedStructuredReport(app, {
      id: "maple-exact",
      authorId: author.id,
      city: "Maple",
      region: "ZZ",
      landlordName: "Maple",
    })
    for (let index = 0; index < 24; index++) {
      for (let report = 0; report < 2; report++) {
        await seedStructuredReport(app, {
          id: `maple-prefix-${index}-${report}`,
          authorId: author.id,
          city: `Maple ${String(index).padStart(2, "0")}`,
          region: "ZZ",
          landlordName: `Maple ${String(index).padStart(2, "0")} Management`,
        })
      }
    }
    for (let index = 0; index < 25; index++) {
      await seedStructuredReport(app, {
        id: `maple-shared-${index}`,
        authorId: author.id,
        city: "Maple Shared",
        region: `R${String(index).padStart(2, "0")}`,
        landlordName: "Unrelated Homes",
      })
    }

    let [suggestions, prefixes] = await runWithReportDatabase(app.database, () =>
      Promise.all([
        listPublicReportSuggestions(
          validReportSuggestionInput(new URLSearchParams({ q: "maple" })),
        ),
        listPublicReportSuggestions(validReportSuggestionInput(new URLSearchParams({ q: "map" }))),
      ]),
    )

    assert.deepEqual(suggestions[0], {
      kind: "city",
      label: "Maple",
      description: "City · ZZ",
      value: "Maple",
    })
    assert.deepEqual(prefixes[0], {
      kind: "city",
      label: "Maple Shared",
      description: "City",
      value: "Maple Shared",
    })
    assert.deepEqual(suggestions[1], {
      kind: "landlord",
      label: "Maple",
      description: "Landlord or manager",
      value: "Maple",
    })
  })

  it("compiles parameterized PostgreSQL suggestion queries without private columns", async () => {
    let recorder = new ReportPostgresQueryRecorder()
    // SAFETY: The recorder implements the query surface exercised by the Postgres adapter.
    let database = createPostgresDatabase(recorder as PostgresDatabaseInput)
    let input = validReportSuggestionInput(new URLSearchParams({ q: "50%_OFF!" }))

    let suggestions = await runWithReportDatabase(database, () =>
      listPublicReportSuggestions(input),
    )

    assert.deepEqual(suggestions, [])
    assert.equal(recorder.queries.length, 2)
    for (let query of recorder.queries) {
      assert.doesNotMatch(query.text, /\?/)
      assert.doesNotMatch(query.text, /"address"|"title"|"content"|"email"|"password"/)
    }
    assert.deepEqual(recorder.queries[0]?.values, [
      "PUBLISHED",
      input.likePattern ?? "",
      "PUBLISHED",
      input.likePattern ?? "",
      input.q,
      input.prefixPattern ?? "",
      24,
    ])
    assert.deepEqual(recorder.queries[1]?.values, [
      "PUBLISHED",
      input.likePattern ?? "",
      input.q,
      input.prefixPattern ?? "",
      24,
    ])
    assert.match(recorder.queries[0]?.text ?? "", /case\s+when/)
    assert.match(recorder.queries[1]?.text ?? "", /case\s+when/)
  })
})

interface CapturedReportQuery {
  text: string
  values: Array<number | string>
}

class ReportPostgresQueryRecorder {
  readonly queries: CapturedReportQuery[] = []

  async query(text: string, values: Array<number | string> = []) {
    this.queries.push({ text, values: [...values] })

    if (text.includes('as "kind"') || text.includes('as "landlordName"')) {
      return { rows: [], rowCount: 0 }
    }
    if (text.includes('as "category"') && !text.includes('as "id"')) {
      return { rows: [], rowCount: 0 }
    }

    return text.includes("count(*)")
      ? { rows: [{ total: "0" }], rowCount: 1 }
      : { rows: [], rowCount: 0 }
  }
}

describe("findPublicReport", () => {
  it("returns an allowlisted published detail with public username", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app, {
      email: "private-detail@example.test",
      password: "private-detail-password",
    })
    let confirmedAt = new Date("2026-08-16T18:00:00.000Z")
    let createdAt = new Date("2026-08-17T08:00:00.000Z")
    await seedStructuredReport(app, {
      id: "published-detail",
      authorId: author.id,
      address: "818 Private Detail Marker",
      experienceConfirmedAt: confirmedAt,
      createdAt,
      updatedAt: createdAt,
    })

    let detail = await runWithReportDatabase(app.database, () =>
      findPublicReport("published-detail"),
    )

    assert.ok(detail)
    assert.equal(detail.username, author.username)
    assert.equal(detail.experienceConfirmedAt?.toISOString(), confirmedAt.toISOString())
    assert.deepEqual(Object.keys(detail).sort(), [
      "category",
      "city",
      "content",
      "createdAt",
      "experienceConfirmedAt",
      "id",
      "landlordName",
      "rating",
      "region",
      "title",
      "username",
    ])
    assert.equal(JSON.stringify(detail).includes("818 Private Detail Marker"), false)
    assert.equal(JSON.stringify(detail).includes("private-detail@example.test"), false)
    assert.equal(JSON.stringify(detail).includes("private-detail-password"), false)
  })

  it("returns honest legacy nulls and hides hidden, missing, and hostile ids", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    await seedLegacyPost(app, { id: "legacy-detail", authorId: author.id })
    await seedStructuredReport(app, {
      id: "hidden-detail",
      authorId: author.id,
      status: "HIDDEN",
    })

    let [legacy, hidden, missing, hostile] = await runWithReportDatabase(app.database, () =>
      Promise.all([
        findPublicReport("legacy-detail"),
        findPublicReport("hidden-detail"),
        findPublicReport("missing-detail"),
        findPublicReport("legacy-detail' or 1 = 1 --"),
      ]),
    )

    assert.ok(legacy)
    assert.equal("address" in legacy, false)
    assert.equal(legacy.city, null)
    assert.equal(legacy.region, null)
    assert.equal(legacy.landlordName, null)
    assert.equal(legacy.category, null)
    assert.equal(legacy.rating, null)
    assert.equal(legacy.experienceConfirmedAt, null)
    assert.equal(hidden, null)
    assert.equal(missing, null)
    assert.equal(hostile, null)
  })
})

function validReportFeedInput(searchParams: URLSearchParams) {
  let parsed = parseReportFeedInput(searchParams)
  assert.equal(parsed.success, true)
  if (!parsed.success) assert.fail("Expected valid report feed input")
  return parsed.value
}

function validReportSuggestionInput(searchParams: URLSearchParams) {
  let parsed = parseReportSuggestionInput(searchParams)
  assert.equal(parsed.success, true)
  if (!parsed.success) assert.fail("Expected valid report suggestion input")
  return parsed.value
}
