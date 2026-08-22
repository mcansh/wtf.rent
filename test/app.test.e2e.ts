import * as assert from "remix/assert"
import { createTestServer } from "remix/node-fetch-server/test"
import { describe, it } from "remix/test"
import type { TestContext } from "remix/test"

import { routes } from "../app/routes.ts"
import { createAuthTestApp } from "./auth.ts"

describe("browser journeys", () => {
  it("renders reports from a filtered URL", { timeout: 15_000 }, async (t) => {
    let { page } = await openTestApp(t)

    await page.goto(
      routes.home.href(undefined, {
        searchParams: { q: "Chicago" },
      }),
    )
    await page.waitForLoadState("networkidle")

    let reports = page.locator("article")
    assert.equal(await reports.count(), 1)
    assert.match(await reports.first().innerText(), /Jordan T\./)
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
    assert.equal(app.database.users.length, 1)
    assert.equal(app.database.users[0]?.email, "browser@example.com")

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
  let app = createAuthTestApp()
  let server = await createTestServer((request) => app.router.fetch(request))
  let page = await t.serve(server)

  await page.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, (route) => route.abort())

  return { app, page }
}
