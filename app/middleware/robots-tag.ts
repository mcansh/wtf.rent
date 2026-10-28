import type { Middleware } from "remix/router"

import { getRequestHostname, shouldNoindex } from "../utils/seo.ts"

export function robotsTag(): Middleware {
  return async (context, next) => {
    let response = await next()
    let hostname = getRequestHostname(context.url, context.headers)
    if (!shouldNoindex(context.url.pathname, hostname)) return response
    if (response.headers.has("X-Robots-Tag")) return response

    let headers = new Headers(response.headers)
    headers.set("X-Robots-Tag", "noindex")

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}
