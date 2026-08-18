import { redirect } from "remix/response/redirect"
import { createController } from "remix/router"

import { listPublicReports, listPublicReportSuggestions } from "../data/reports.ts"
import { users } from "../data/schema.ts"
import { db } from "../db.ts"
import { requireAuth } from "../middleware/auth.ts"
import { routes } from "../routes.ts"
import { DocumentWithShell } from "../ui/shell.tsx"
import { assetServer } from "../utils/assets.ts"
import { getCurrentUser } from "../utils/context.ts"
import { HomePage } from "./home-page/public/page.tsx"
import { serializeReportPage } from "./home-page/report.ts"
import { parseReportSuggestionInput } from "./home-page/suggestion-input.ts"
import { notFound } from "./not-found.tsx"
import { parseReportFeedInput } from "./post/report-input.ts"
import { ProfilePage } from "./profile/page.tsx"

export const controller = createController(routes, {
  actions: {
    async assets(context) {
      let response = await assetServer.fetch(context.request)
      if (response == null) {
        return new Response("Not Found", { status: 404 })
      }
      return response
    },

    home: {
      async handler(context) {
        let input = parseReportFeedInput(context.url.searchParams)
        let reportPage = await listPublicReports(context.db, input)

        return context.render(
          <DocumentWithShell>
            <HomePage query={input.q} reportPage={serializeReportPage(reportPage)} />
          </DocumentWithShell>,
        )
      },
    },

    reportSuggestions: {
      async handler(context) {
        let input = parseReportSuggestionInput(context.url.searchParams)
        let suggestions = await listPublicReportSuggestions(context.db, input)

        return Response.json(
          { suggestions },
          { headers: { "Cache-Control": "private, max-age=60" } },
        )
      },
    },

    logout(context) {
      context.session.unset("auth")
      context.session.regenerateId(true)

      return redirect(routes.home.href(), 303)
    },

    health: {
      async handler(context) {
        let host = context.headers.get("X-Forwarded-Host") ?? context.headers.get("Host")
        let timestamp = new Date().toISOString()

        try {
          let url = new URL("/", `http://${host}`)
          // if we can connect to the database and make a simple query
          // and make a HEAD request to ourselves, then we're good.
          await Promise.all([
            db.findMany(users),
            fetch(url.toString(), { method: "HEAD" }).then((r) => {
              if (!r.ok) return Promise.reject(r)
            }),
          ])
          return Response.json({ status: "OK", timestamp })
        } catch (error: unknown) {
          console.error("healthcheck ❌", { error })
          return Response.json({ status: "ERROR", timestamp }, { status: 500 })
        }
      },
    },

    profile: {
      middleware: [requireAuth()],
      async handler(context) {
        let user = getCurrentUser()

        return context.render(<ProfilePage username={user.username} email={user.email} />)
      },
    },

    about: {
      async handler(context) {
        return notFound(context.render)
      },
    },

    directory: {
      async handler(context) {
        return notFound(context.render)
      },
    },

    rights: {
      async handler(context) {
        return notFound(context.render)
      },
    },
  },
})
