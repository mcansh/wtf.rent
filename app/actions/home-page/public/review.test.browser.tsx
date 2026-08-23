import * as assert from "remix/assert"
import { describe, it } from "remix/test"
import { render } from "remix/ui/test"

import type { ClientReportSummary } from "./review.tsx"
import { ReportCard } from "./review.tsx"

const report = {
  categoryLabel: "Maintenance",
  city: "Chicago",
  content: "A browser test can verify the persisted report card without starting the whole app.",
  createdAt: "2026-08-17T12:00:00.000Z",
  id: "browser-report",
  landlordName: "Example Homes",
  rating: 4,
  region: "IL",
  title: "The leak finally stopped.",
  username: "browser-renter",
} satisfies ClientReportSummary

describe("ReportCard", () => {
  it("renders persisted report details and detail links", (t) => {
    let result = render(<ReportCard report={report} />)
    t.after(result.cleanup)

    let article = result.$("article")
    assert.ok(article)
    assert.match(article.textContent ?? "", /@browser-renter/)
    assert.match(article.textContent ?? "", /Chicago, IL/)
    assert.match(article.textContent ?? "", /Managed by Example Homes/)
    assert.ok(article.querySelector('[aria-label="4 out of 5 rating"]'))

    let detailLinks = article.querySelectorAll('a[href="/posts/browser-report"]')
    assert.equal(detailLinks.length, 2)
  })

  it("renders legacy-safe fallback values", (t) => {
    let result = render(
      <ReportCard
        report={{
          ...report,
          categoryLabel: null,
          city: null,
          landlordName: null,
          rating: null,
          region: null,
        }}
      />,
    )
    t.after(result.cleanup)

    let article = result.$("article")
    assert.ok(article)
    assert.match(article.textContent ?? "", /Legacy report/)
    assert.match(article.textContent ?? "", /Location unavailable/)
    assert.doesNotMatch(article.textContent ?? "", /Managed by|out of 5 rating/)
  })
})
