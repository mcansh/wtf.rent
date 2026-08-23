import type { CreateSecureHeaders } from "@mcansh/http-helmet"
import { createSecureHeaders, mergeHeaders, NONE, SELF } from "@mcansh/http-helmet"
import type { Cookie } from "remix/cookie"
import type { Database } from "remix/data-table"
import { asyncContext } from "remix/middleware/async-context"
import { csrf } from "remix/middleware/csrf"
import { formData } from "remix/middleware/form-data"
import { session } from "remix/middleware/session"
import { staticFiles } from "remix/middleware/static"
import type { Middleware, MiddlewareContext, RequestContext } from "remix/router"
import { createRouter } from "remix/router"
import type { SessionStorage } from "remix/session"

import { controller } from "./actions/controller.tsx"
import { join } from "./actions/join/controller.tsx"
import { login } from "./actions/login/controller.tsx"
import { notFoundHandler } from "./actions/not-found.tsx"
import { post } from "./actions/post/controller.tsx"
import { loadAssetEntry } from "./middleware/assets.ts"
import type { LoginThrottle } from "./middleware/auth.ts"
import { loadAuth, loadLoginThrottle } from "./middleware/auth.ts"
import { loadDatabase } from "./middleware/database.ts"
import { render } from "./middleware/render.tsx"
import { loadReportSuggestions } from "./middleware/report-suggestions.ts"
import type { RequestTelemetryOptions } from "./middleware/request-telemetry.ts"
import { requestTelemetry } from "./middleware/request-telemetry.ts"
import { sessionCookie, sessionStorage } from "./middleware/session.ts"
import { routes } from "./routes.ts"

export type AppContext = MiddlewareContext<
  [
    ReturnType<typeof asyncContext>,
    ReturnType<typeof formData>,
    ReturnType<typeof session>,
    ReturnType<typeof csrf>,
    // ReturnType<typeof staticFiles>,
    ReturnType<typeof render>,
    ReturnType<typeof loadDatabase>,
    ReturnType<typeof loadReportSuggestions>,
    ReturnType<typeof loadAuth>,
    ReturnType<typeof loadLoginThrottle>,
    ReturnType<typeof loadAssetEntry>,
  ]
>

declare module "remix/router" {
  interface RouterTypes {
    context: AppContext
  }
}

export interface AppRouterOptions {
  database?: Database
  loginThrottle?: LoginThrottle
  photonFetch?: typeof globalThis.fetch
  requestTelemetry?: RequestTelemetryOptions
  sessionCookie?: Cookie
  sessionStorage?: SessionStorage
}

export function createAppRouter(options: AppRouterOptions = {}) {
  let middleware: Middleware<any>[] = []

  middleware.push(requestTelemetry(options.requestTelemetry))
  middleware.push(asyncContext())
  middleware.push(
    secureHeaderMiddleware({
      "Content-Security-Policy": {
        "default-src": [NONE],
        "script-src": [SELF],
        "style-src": [SELF, "https://fonts.googleapis.com"],
        "connect-src": [SELF],
        "font-src": [SELF, "https://fonts.gstatic.com"],
        "img-src": [SELF],
        "manifest-src": [SELF],
      },
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Referrer-Policy": "origin-when-cross-origin",
      "Strict-Transport-Security": true,
      "X-Content-Type-Options": "nosniff",
      "X-DNS-Prefetch-Control": "on",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
    }),
  )
  middleware.push(staticFiles("./public", { index: false }))
  middleware.push(formData())
  middleware.push(
    session(options.sessionCookie ?? sessionCookie, options.sessionStorage ?? sessionStorage),
  )
  middleware.push(csrf({ origin: ["rent.mcan.sh"] }))
  middleware.push(render())
  middleware.push(loadDatabase(options.database))
  middleware.push(loadReportSuggestions({ photonFetch: options.photonFetch }))
  middleware.push(loadAuth())
  middleware.push(loadLoginThrottle(options.loginThrottle))
  middleware.push(loadAssetEntry())

  let appRouter = createRouter<AppContext>({ middleware })

  appRouter.map(routes, controller)
  appRouter.map(routes.join, join)
  appRouter.map(routes.login, login)
  appRouter.map(routes.post, post)
  appRouter.map("*", notFoundHandler)

  return appRouter
}

export const router = createAppRouter()

function secureHeaderMiddleware(
  options: CreateSecureHeaders & { skip?: (context: RequestContext) => boolean },
): Middleware {
  return async (context, next) => {
    let response = await next()

    if (options.skip?.(context)) return response

    let secureHeaders = createSecureHeaders(options)

    let merged = mergeHeaders(secureHeaders, response.headers)

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: merged,
    })
  }
}
