import { describe, it } from "node:test"

import * as assert from "remix/assert"
import { createPostgresDatabase } from "remix/data-table/postgres"
import type { PostgresDatabaseInput } from "remix/data-table/postgres"

import {
  createReportTestApp,
  runWithReportDatabase,
  seedReportUser,
  seedStructuredReport,
} from "../../test/reports.ts"
import { parseDirectoryInput } from "../actions/directory/input.ts"
import { DIRECTORY_PAGE_SIZE, listPublicDirectoryEntries } from "./directory.ts"

describe("listPublicDirectoryEntries", () => {
  it("groups and counts only public landlord and location fields", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app, {
      email: "private-directory@example.test",
      password: "private-directory-password",
    })

    for (let index = 0; index < 2; index++) {
      await seedStructuredReport(app, {
        id: `maple-detroit-${index}`,
        authorId: author.id,
        address: `${index} Private Directory Street`,
        title: `Private directory title ${index}`,
        content: `Private directory report content ${index} stays outside aggregate results.`,
        landlordName: "Maple Management",
        city: "Detroit",
        region: "MI",
      })
    }
    await seedStructuredReport(app, {
      id: "maple-ann-arbor",
      authorId: author.id,
      landlordName: "Maple Management",
      city: "Ann Arbor",
      region: "MI",
    })
    await seedStructuredReport(app, {
      id: "alpha-grand-rapids",
      authorId: author.id,
      landlordName: "Alpha Rentals",
      city: "Grand Rapids",
      region: "MI",
    })
    await seedStructuredReport(app, {
      id: "blank-landlord",
      authorId: author.id,
      landlordName: "   ",
    })
    await seedStructuredReport(app, {
      id: "missing-landlord",
      authorId: author.id,
      landlordName: null,
    })
    await seedStructuredReport(app, {
      id: "hidden-landlord",
      authorId: author.id,
      landlordName: "Hidden Homes",
      city: "Secretville",
      region: "ZZ",
      status: "HIDDEN",
    })

    let page = await runWithReportDatabase(app.database, () =>
      listPublicDirectoryEntries(parseDirectoryInput(new URLSearchParams())),
    )

    assert.deepEqual(page, {
      entries: [
        {
          landlordName: "Alpha Rentals",
          city: "Grand Rapids",
          region: "MI",
          reportCount: 1,
        },
        {
          landlordName: "Maple Management",
          city: "Ann Arbor",
          region: "MI",
          reportCount: 1,
        },
        {
          landlordName: "Maple Management",
          city: "Detroit",
          region: "MI",
          reportCount: 2,
        },
      ],
      total: 3,
      page: 1,
      pageSize: DIRECTORY_PAGE_SIZE,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    })
    assert.deepEqual(Object.keys(page.entries[0]!).sort(), [
      "city",
      "landlordName",
      "region",
      "reportCount",
    ])
    assert.doesNotMatch(
      JSON.stringify(page),
      /Private Directory|private-directory|Hidden Homes|Secretville/,
    )
  })

  it("searches public fields case-insensitively and treats LIKE metacharacters literally", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)

    await seedStructuredReport(app, {
      id: "literal-directory-name",
      authorId: author.id,
      landlordName: "50%_Off! Homes",
      city: "Detroit",
      region: "MI",
    })
    await seedStructuredReport(app, {
      id: "wildcard-lookalike",
      authorId: author.id,
      landlordName: "500XOff Homes",
      city: "Cleveland",
      region: "OH",
    })

    let [literal, city, region] = await runWithReportDatabase(app.database, () =>
      Promise.all([
        listPublicDirectoryEntries(parseDirectoryInput(new URLSearchParams({ q: "50%_off!" }))),
        listPublicDirectoryEntries(parseDirectoryInput(new URLSearchParams({ q: "dEtRoIt" }))),
        listPublicDirectoryEntries(parseDirectoryInput(new URLSearchParams({ q: "oh" }))),
      ]),
    )

    assert.deepEqual(
      literal.entries.map((entry) => entry.landlordName),
      ["50%_Off! Homes"],
    )
    assert.deepEqual(
      city.entries.map((entry) => entry.landlordName),
      ["50%_Off! Homes"],
    )
    assert.deepEqual(
      region.entries.map((entry) => entry.landlordName),
      ["500XOff Homes"],
    )
    assert.equal(literal.total, 1)
    assert.equal(city.total, 1)
    assert.equal(region.total, 1)
  })

  it("returns stable 24-entry pages with matching totals", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)

    for (let index = 0; index < 26; index++) {
      await seedStructuredReport(app, {
        id: `directory-page-${index}`,
        authorId: author.id,
        landlordName: `Company ${String(index).padStart(2, "0")}`,
      })
    }

    let [first, second] = await runWithReportDatabase(app.database, () =>
      Promise.all([
        listPublicDirectoryEntries(parseDirectoryInput(new URLSearchParams({ page: "1" }))),
        listPublicDirectoryEntries(parseDirectoryInput(new URLSearchParams({ page: "2" }))),
      ]),
    )

    assert.equal(first.entries.length, DIRECTORY_PAGE_SIZE)
    assert.equal(first.entries[0]?.landlordName, "Company 00")
    assert.equal(first.entries.at(-1)?.landlordName, "Company 23")
    assert.equal(first.total, 26)
    assert.equal(first.totalPages, 2)
    assert.equal(first.hasPreviousPage, false)
    assert.equal(first.hasNextPage, true)
    assert.deepEqual(
      second.entries.map((entry) => entry.landlordName),
      ["Company 24", "Company 25"],
    )
    assert.equal(second.total, 26)
    assert.equal(second.hasPreviousPage, true)
    assert.equal(second.hasNextPage, false)
  })

  it("compiles equivalent parameterized PostgreSQL list and grouped-count intent", async () => {
    let recorder = new DirectoryPostgresQueryRecorder()
    // SAFETY: The recorder implements the query surface exercised by the PostgreSQL adapter.
    let database = createPostgresDatabase(recorder as PostgresDatabaseInput)
    let input = parseDirectoryInput(new URLSearchParams({ q: "50%_OFF!", page: "3" }))

    let page = await runWithReportDatabase(database, () => listPublicDirectoryEntries(input))

    assert.deepEqual(page.entries, [])
    assert.equal(page.total, 0)
    assert.equal(recorder.queries.length, 2)
    for (let query of recorder.queries) {
      assert.doesNotMatch(query.text, /\?/)
      assert.doesNotMatch(query.text, /"address"|"title"|"content"|"email"|"password"|"authorId"/)
      assert.match(query.text, /p\."status" = \$1/)
      assert.match(query.text, /escape '!'/)
      assert.match(query.text, /group by p\."landlordName", p\."city", p\."region"/)
    }

    let [listQuery, countQuery] = recorder.queries
    assert.ok(listQuery)
    assert.ok(countQuery)
    assert.match(listQuery.text, /order by/)
    assert.match(listQuery.text, /limit \$5\s+offset \$6/)
    assert.deepEqual(listQuery.values, [
      "PUBLISHED",
      input.likePattern ?? "",
      input.likePattern ?? "",
      input.likePattern ?? "",
      DIRECTORY_PAGE_SIZE,
      DIRECTORY_PAGE_SIZE * 2,
    ])
    assert.match(countQuery.text, /select count\(\*\) as "total"\s+from \(/)
    assert.doesNotMatch(countQuery.text, /order by|limit|offset/)
    assert.deepEqual(countQuery.values, [
      "PUBLISHED",
      input.likePattern ?? "",
      input.likePattern ?? "",
      input.likePattern ?? "",
    ])
  })
})

interface CapturedDirectoryQuery {
  text: string
  values: Array<number | string>
}

class DirectoryPostgresQueryRecorder {
  readonly queries: CapturedDirectoryQuery[] = []

  async query(text: string, values: Array<number | string> = []) {
    this.queries.push({ text, values: [...values] })

    return text.includes('as "reportCount"')
      ? { rows: [], rowCount: 0 }
      : { rows: [{ total: "0" }], rowCount: 1 }
  }
}
