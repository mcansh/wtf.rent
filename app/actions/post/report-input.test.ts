import { describe, it } from "node:test"

import * as assert from "remix/assert"

import { REPORT_CATEGORIES } from "../../data/schema.ts"
import {
  getSafeReportValues,
  parseCreateReportInput,
  parseReportFeedInput,
  parseUpdateReportInput,
  REPORT_CATEGORY_LABELS,
} from "./report-input.ts"

describe("report create input", () => {
  it("normalizes a complete report and ignores server-owned fields", () => {
    let formData = validReportForm({
      address: "  123 Main Street  ",
      city: "  Detroit ",
      region: " MI  ",
      landlordName: "   ",
      title: "  A renter's account  ",
      content: "  This is a detailed firsthand rental experience.  ",
      authorId: "forged-author",
      status: "HIDDEN",
      experienceConfirmedAt: "2000-01-01T00:00:00.000Z",
    })

    let parsed = parseCreateReportInput(formData)

    assert.equal(parsed.success, true)
    if (!parsed.success) assert.fail("Expected valid report input")
    assert.deepEqual(parsed.value, {
      address: "123 Main Street",
      city: "Detroit",
      region: "MI",
      landlordName: null,
      category: "MAINTENANCE",
      rating: 4,
      title: "A renter's account",
      content: "This is a detailed firsthand rental experience.",
      isFirsthand: true,
    })
  })

  it("trims a present landlord name", () => {
    let parsed = parseCreateReportInput(validReportForm({ landlordName: "  Example Homes  " }))

    assert.equal(parsed.success, true)
    if (!parsed.success) assert.fail("Expected valid landlord input")
    assert.equal(parsed.value.landlordName, "Example Homes")
  })

  it("rejects blank, short, overlong, and unsupported values at their fields", () => {
    let cases = [
      ["address", " ", "address"],
      ["city", "x".repeat(101), "city"],
      ["region", "x".repeat(101), "region"],
      ["landlordName", "x", "landlordName"],
      ["category", "NOT_A_CATEGORY", "category"],
      ["rating", "1.5", "rating"],
      ["title", "tiny", "title"],
      ["content", "too short", "content"],
    ] as const

    for (let [name, value, expectedField] of cases) {
      let parsed = parseCreateReportInput(validReportForm({ [name]: value }))

      assert.equal(parsed.success, false, name)
      if (parsed.success) assert.fail(`Expected ${name} to fail`)
      assert.ok(
        parsed.issues.some((issue) => issue.path?.[0] === expectedField),
        name,
      )
    }
  })

  it("accepts only integer ratings from 1 through 5", () => {
    for (let rating of ["1", "2", "3", "4", "5"]) {
      let parsed = parseCreateReportInput(validReportForm({ rating }))
      assert.equal(parsed.success, true, rating)
    }

    for (let rating of ["", "0", "6", "-1", "NaN"]) {
      let parsed = parseCreateReportInput(validReportForm({ rating }))
      assert.equal(parsed.success, false, rating)
    }
  })

  it("requires the firsthand privacy confirmation", () => {
    let parsed = parseCreateReportInput(validReportForm({ isFirsthand: undefined }))

    assert.equal(parsed.success, false)
    if (parsed.success) assert.fail("Expected missing attestation to fail")
    assert.ok(parsed.issues.some((issue) => issue.path?.[0] === "isFirsthand"))
  })

  it("rejects common apartment and unit designators", () => {
    let addresses = [
      "123 Main Street Apartment 4",
      "123 Main Street Apt. 4",
      "123 Main Street Apt #4",
      "123 Main Street Unit 4",
      "123 Main Street Suite 200",
      "123 Main Street Ste 2",
      "123 Main Street #4",
    ]

    for (let address of addresses) {
      let parsed = parseCreateReportInput(validReportForm({ address }))

      assert.equal(parsed.success, false, address)
      if (parsed.success) assert.fail(`Expected unit address to fail: ${address}`)
      assert.ok(
        parsed.issues.some((issue) => issue.path?.[0] === "address"),
        address,
      )
    }
  })

  it("preserves street names that begin with unit-designator text", () => {
    for (let address of ["1 United Nations Plaza", "123 Unity Street", "123 Aptos Lane"]) {
      let parsed = parseCreateReportInput(validReportForm({ address }))

      assert.equal(parsed.success, true, address)
    }
  })

  it("rejects NUL from every persisted free-text field", () => {
    let cases = {
      address: "123 Main\0 Street",
      city: "Det\0roit",
      region: "M\0I",
      landlordName: "Example\0 Homes",
      title: "Repairs\0 required repeated follow-up",
      content: "This is a detailed\0 firsthand rental experience.",
    }

    for (let [field, value] of Object.entries(cases)) {
      let parsed = parseCreateReportInput(validReportForm({ [field]: value }))

      assert.equal(parsed.success, false, field)
      if (parsed.success) assert.fail(`Expected ${field} to reject NUL`)
      assert.ok(
        parsed.issues.some((issue) => issue.path?.[0] === field && /NUL/.test(issue.message)),
        field,
      )
    }
  })

  it("retains only bounded safe values for an invalid-form response", () => {
    let values = getSafeReportValues(
      validReportForm({
        address: `  ${"a".repeat(500)}  `,
        city: "c".repeat(500),
        region: "r".repeat(500),
        landlordName: "l".repeat(500),
        category: "FORGED",
        rating: "99",
        title: "t".repeat(500),
        content: "x".repeat(10_000),
        authorId: "forged-author",
      }),
    )

    assert.equal(values.address.length, 160)
    assert.equal(values.city.length, 100)
    assert.equal(values.region.length, 100)
    assert.equal(values.landlordName.length, 160)
    assert.equal(values.category, "")
    assert.equal(values.rating, "")
    assert.equal(values.title.length, 120)
    assert.equal(values.content.length, 5_000)
    assert.equal("authorId" in values, false)
  })
})

describe("report update input", () => {
  it("uses the complete normalized report contract", () => {
    let formData = validReportForm({
      address: "  456 Woodward Avenue  ",
      city: "  Detroit ",
      region: " MI  ",
      landlordName: "  Example Homes  ",
      title: "  Repairs improved after follow-up  ",
      content: "  The maintenance team completed the repair after I followed up.  ",
      authorId: "forged-author",
      status: "HIDDEN",
    })

    let parsed = parseUpdateReportInput(formData)

    assert.equal(parsed.success, true)
    if (!parsed.success) assert.fail("Expected valid report update input")
    assert.deepEqual(parsed.value, {
      address: "456 Woodward Avenue",
      city: "Detroit",
      region: "MI",
      landlordName: "Example Homes",
      category: "MAINTENANCE",
      rating: 4,
      title: "Repairs improved after follow-up",
      content: "The maintenance team completed the repair after I followed up.",
      isFirsthand: true,
    })
    assert.equal("authorId" in parsed.value, false)
    assert.equal("status" in parsed.value, false)
  })

  it("rejects an incomplete update instead of weakening create requirements", () => {
    let parsed = parseUpdateReportInput(
      validReportForm({ address: " ", isFirsthand: undefined }),
    )

    assert.equal(parsed.success, false)
    if (parsed.success) assert.fail("Expected incomplete report update input to fail")
    assert.ok(parsed.issues.some((issue) => issue.path?.[0] === "address"))
    assert.ok(parsed.issues.some((issue) => issue.path?.[0] === "isFirsthand"))
  })
})

describe("report feed input", () => {
  it("normalizes the display query and creates a literal LIKE pattern", () => {
    let params = new URLSearchParams({ q: "  50%_off! today  ", page: "3" })

    assert.deepEqual(validReportFeedInput(params), {
      q: "50%_off! today",
      page: 3,
      likePattern: "%50!%!_off!! today%",
    })
  })

  it("caps the query and normalizes invalid or missing pages to one", () => {
    let capped = validReportFeedInput(
      new URLSearchParams({ q: `  ${"q".repeat(150)}  `, page: "2" }),
    )
    assert.equal(capped.q.length, 100)
    assert.equal(capped.likePattern?.length, 102)

    for (let page of [undefined, "", "0", "-1", "1.5", "abc", "9007199254740992"]) {
      let params = new URLSearchParams()
      if (page !== undefined) params.set("page", page)

      assert.equal(validReportFeedInput(params).page, 1, String(page))
    }
  })

  it("returns no search pattern for an empty query", () => {
    assert.deepEqual(validReportFeedInput(new URLSearchParams()), {
      q: "",
      page: 1,
      likePattern: null,
    })
  })

  it("rejects NUL before building a database search pattern", () => {
    let parsed = parseReportFeedInput(new URLSearchParams({ q: "private\0query" }))

    assert.equal(parsed.success, false)
    if (parsed.success) assert.fail("Expected a NUL search query to fail")
    assert.ok(parsed.issues.some((issue) => issue.path?.[0] === "q"))
  })
})

describe("report category labels", () => {
  it("defines one public label for every persisted category", () => {
    assert.deepEqual(Object.keys(REPORT_CATEGORY_LABELS), [...REPORT_CATEGORIES])
    assert.equal(REPORT_CATEGORY_LABELS.FEES_OR_DEPOSIT, "Fees or deposit")
    assert.equal(REPORT_CATEGORY_LABELS.GOOD_EXPERIENCE, "Good experience")
  })
})

function validReportForm(overrides: Record<string, string | undefined> = {}): FormData {
  let values = {
    address: "123 Main Street",
    city: "Detroit",
    region: "MI",
    landlordName: "",
    category: "MAINTENANCE",
    rating: "4",
    title: "A renter's account",
    content: "This is a detailed firsthand rental experience.",
    isFirsthand: "on",
    ...overrides,
  }
  let formData = new FormData()

  for (let [name, value] of Object.entries(values)) {
    if (value !== undefined) formData.set(name, value)
  }

  return formData
}

function validReportFeedInput(searchParams: URLSearchParams) {
  let parsed = parseReportFeedInput(searchParams)
  assert.equal(parsed.success, true)
  if (!parsed.success) assert.fail("Expected valid report feed input")
  return parsed.value
}
