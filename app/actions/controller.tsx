import { redirect } from "remix/response/redirect"
import { createController } from "remix/router"

import { listPublicDirectoryEntries } from "../data/directory.ts"
import { listPublicReports } from "../data/reports.ts"
import { users } from "../data/schema.ts"
import { db } from "../db.ts"
import { requireAuth } from "../middleware/auth.ts"
import { ReportSuggestions } from "../middleware/report-suggestions.ts"
import { routes } from "../routes.ts"
import { DocumentWithShell } from "../ui/shell.tsx"
import { assetServer } from "../utils/assets.ts"
import { getCurrentUser } from "../utils/context.ts"
import { parseDirectoryInput } from "./directory/input.ts"
import { DirectoryPage } from "./directory/page.tsx"
import { HomePage } from "./home-page/public/page.tsx"
import { serializeReportPage } from "./home-page/report.ts"
import { parseReportSuggestionInput } from "./home-page/suggestion-input.ts"
import { notFound } from "./not-found.tsx"
import { parseReportFeedInput } from "./post/report-input.ts"
import { ProfilePage } from "./profile/page.tsx"
import { RightsPage } from "./rights/page.tsx"
import { RIGHTS_GUIDE } from "./rights/resources.ts"

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
        let parsed = parseReportFeedInput(context.url.searchParams)
        if (!parsed.success) return new Response("Invalid search query", { status: 400 })

        let input = parsed.value
        let reportPage = await listPublicReports(input)

        return context.render(
          <DocumentWithShell>
            <HomePage
              query={input.q}
              reportPage={serializeReportPage(reportPage)}
              radius={input.radius != null ? String(input.radius) : ""}
              lat={input.lat != null ? String(input.lat) : ""}
              lng={input.lng != null ? String(input.lng) : ""}
            />
          </DocumentWithShell>,
        )
      },
    },

    reportSuggestions: {
      async handler(context) {
        let parsed = parseReportSuggestionInput(context.url.searchParams)
        if (!parsed.success) return new Response("Invalid search query", { status: 400 })

        let suggestions = await context.get(ReportSuggestions)(parsed.value)

        return Response.json(
          { suggestions },
          {
            headers: {
              "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
            },
          },
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
          return Response.json(
            { status: "OK", timestamp },
            { headers: { "Cache-Control": "no-store" } },
          )
        } catch (error: unknown) {
          console.error("healthcheck ❌", { error })
          return Response.json(
            { status: "ERROR", timestamp },
            { status: 500, headers: { "Cache-Control": "no-store" } },
          )
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
        let parsed = parseDirectoryInput(context.url.searchParams)
        if (!parsed.success) return new Response("Invalid search query", { status: 400 })

        let input = parsed.value
        let directoryPage = await listPublicDirectoryEntries(input)

        return context.render(
          <DocumentWithShell title="Directory | wtf.rent">
            <DirectoryPage input={input} directoryPage={directoryPage} />
          </DocumentWithShell>,
        )
      },
    },

    rights: {
      async handler(context) {
        return context.render(
          <DocumentWithShell title="Renter rights | wtf.rent">
            <RightsPage guide={RIGHTS_GUIDE} />
          </DocumentWithShell>,
          { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
        )
      },
    },
  },
})
