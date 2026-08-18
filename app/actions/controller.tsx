import { redirect } from "remix/response/redirect"
import { createController } from "remix/router"
import type { Handle } from "remix/ui"

import type { PublicReportPage } from "../data/reports.ts"
import { listPublicReports } from "../data/reports.ts"
import { users } from "../data/schema.ts"
import { db } from "../db.ts"
import { requireAuth } from "../middleware/auth.ts"
import { routes } from "../routes.ts"
import { DocumentWithShell } from "../ui/shell.tsx"
import { assetServer } from "../utils/assets.ts"
import { getCurrentUser } from "../utils/context.ts"
import type { ClientReportPage } from "./home-page/public/page.tsx"
import { HomePage } from "./home-page/public/page.tsx"
import { notFound } from "./not-found.tsx"
import { parseReportFeedInput, REPORT_CATEGORY_LABELS } from "./post/report-input.ts"

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

    logout(context) {
      context.session.unset("auth")
      context.session.regenerateId(true)

      return redirect(routes.home.href(), 303)
    },

    health: {
      async handler(context) {
        let host = context.headers.get("X-Forwarded-Host") ?? context.headers.get("Host")

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
          return new Response("OK")
        } catch (error: unknown) {
          console.log("healthcheck ❌", { error })
          return new Response("ERROR", { status: 500 })
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

function serializeReportPage(reportPage: PublicReportPage): ClientReportPage {
  return {
    ...reportPage,
    reports: reportPage.reports.map((report) => ({
      id: report.id,
      title: report.title,
      content: report.content,
      city: report.city,
      region: report.region,
      landlordName: report.landlordName,
      categoryLabel: report.category == null ? null : REPORT_CATEGORY_LABELS[report.category],
      rating: report.rating,
      createdAt: report.createdAt.toISOString(),
      username: report.username,
    })),
  }
}

function ProfilePage(handle: Handle<{ email: string; username: string }>) {
  return () => (
    <DocumentWithShell title={`${handle.props.username} · wtf.rent`}>
      <main className="min-h-[calc(100vh-4.375rem)] bg-blue-100 px-5 py-12 min-[541px]:px-8 min-[901px]:min-h-[calc(100vh-5.125rem)] min-[901px]:px-[8vw] min-[901px]:py-18">
        <section className="border-ink-950 shadow-ink-950 bg-paper-50 mx-auto max-w-180 border-2 p-6 shadow-[7px_7px_0_var(--color-ink-950)] min-[541px]:p-9 min-[901px]:p-12">
          <p className="font-mono text-[10px] font-medium tracking-[1.1px] uppercase">
            Your account
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-none font-extrabold tracking-[-2px] min-[541px]:text-6xl">
            Profile
          </h1>
          <dl className="border-ink-950 mt-9 grid gap-6 border-t-2 pt-7 min-[541px]:grid-cols-2">
            <div>
              <dt className="font-mono text-[10px] font-bold tracking-[.8px] uppercase">
                Username
              </dt>
              <dd className="mt-2 text-lg font-bold break-words">{handle.props.username}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-bold tracking-[.8px] uppercase">Email</dt>
              <dd className="mt-2 text-lg font-bold break-words">{handle.props.email}</dd>
            </div>
          </dl>
        </section>
      </main>
    </DocumentWithShell>
  )
}
