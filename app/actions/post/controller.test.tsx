import { describe, it } from "node:test"

import * as assert from "remix/assert"

import { createAuthTestApp, createSessionCookie } from "../../../test/auth.ts"
import { routes } from "../../routes.ts"

describe("post authorization", () => {
  it("redirects guests from every post write and editor route", async () => {
    let app = createAuthTestApp()
    let csrfToken = "post-csrf-token"
    let cookie = await createSessionCookie(app, (session) => session.set("_csrf", csrfToken))
    let protectedRequests = [
      [routes.post.new.href(), "GET"],
      [routes.post.create.href(), "POST"],
      [routes.post.edit.href(), "GET"],
      [routes.post.update.href(), "PUT"],
      [routes.post.destroy.href(), "DELETE"],
    ] as const

    for (let [pathname, method] of protectedRequests) {
      let response = await app.router.fetch(request(pathname, method, cookie, csrfToken))
      let location = new URL(response.headers.get("Location")!, "http://localhost")

      assert.equal(response.status, 302, `${method} ${pathname}`)
      assert.equal(location.pathname, routes.login.index.href(), `${method} ${pathname}`)
      assert.equal(location.searchParams.get("returnTo"), pathname, `${method} ${pathname}`)
    }
  })

  it("keeps the post show route public", async () => {
    let app = createAuthTestApp()
    let response = await app.router.fetch(request(routes.post.show.href()))

    assert.equal(response.status, 404)
    assert.equal(response.headers.get("Location"), null)
  })
})

function request(pathname: string, method = "GET", cookie?: string, csrfToken?: string): Request {
  let headers = new Headers()
  if (cookie) headers.set("Cookie", cookie)

  let formData: FormData | undefined
  if (csrfToken && method !== "GET") {
    formData = new FormData()
    formData.set("_csrf", csrfToken)
  }

  return new Request(new URL(pathname, "http://localhost"), {
    method,
    headers,
    body: formData,
  })
}
