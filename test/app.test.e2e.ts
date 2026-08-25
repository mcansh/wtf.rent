import * as assert from "remix/assert"
import { createTestServer } from "remix/node-fetch-server/test"
import { describe, it } from "remix/test"
import type { TestContext } from "remix/test"

import { users } from "../app/data/schema.ts"
import { routes } from "../app/routes.ts"
import { createReportTestApp, seedReportUser, seedStructuredReport } from "./reports.ts"

describe("browser journeys", () => {
  it("closes the mobile navigation after navigating", { timeout: 15_000 }, async (t) => {
    let { page } = await openTestApp(t)
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto(routes.home.href())
    await page.waitForLoadState("networkidle")
    let menu = page.getByRole("navigation", { name: "Primary" }).locator("details")
    await menu.locator("summary").click()
    assert.equal(await menu.getAttribute("open"), "")

    await menu.getByRole("link", { name: "Directory" }).click()
    await page.getByRole("heading", { name: "Browse the public record" }).waitFor()

    assert.equal(new URL(page.url()).pathname, routes.directory.href())
    assert.equal(await menu.getAttribute("open"), null)
  })

  it("renders reports from a filtered URL", { timeout: 15_000 }, async (t) => {
    let { app, page } = await openTestApp(t)
    let author = await seedReportUser(app, { username: "jordan-t" })
    await seedStructuredReport(app, {
      id: "chicago-report",
      authorId: author.id,
      city: "Chicago",
      region: "IL",
    })
    await seedStructuredReport(app, {
      id: "detroit-report",
      authorId: author.id,
      city: "Detroit",
      region: "MI",
    })

    await page.goto(
      routes.home.href(undefined, {
        searchParams: { q: "Chicago" },
      }),
    )
    await page.waitForLoadState("networkidle")

    let reports = page.locator("article")
    assert.equal(await reports.count(), 1)
    assert.match(await reports.first().innerText(), /@jordan-t/)
  })

  it("creates an account and keeps the browser signed in", { timeout: 15_000 }, async (t) => {
    let { app, page } = await openTestApp(t)

    await page.goto(routes.join.index.href())
    await page.getByLabel("Username").fill("browser-renter")
    await page.getByLabel("Email address").fill("browser@example.com")
    await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple")
    await page.getByLabel("Confirm password").fill("correct horse battery staple")
    await page.getByRole("button", { name: "Create account" }).click()

    await page.getByRole("link", { name: "Profile" }).waitFor()
    assert.equal(new URL(page.url()).pathname, routes.home.href())
    let registeredUsers = await app.database.findMany(users)
    assert.equal(registeredUsers.length, 1)
    assert.equal(registeredUsers[0]?.email, "browser@example.com")

    await page.getByRole("link", { name: "Profile" }).click()
    await page.getByRole("heading", { name: "Profile" }).waitFor()
    assert.equal(new URL(page.url()).pathname, routes.profile.href())
    assert.equal(
      await page.getByText("browser-renter", { exact: true }).innerText(),
      "browser-renter",
    )
  })
})

async function openTestApp(t: TestContext) {
  let app = createReportTestApp()
  t.after(() => app.close())
  let server = await createTestServer((request) => app.router.fetch(request))
  let page = await t.serve(server)

  await page.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, (route) => route.abort())

  return { app, page }
}
