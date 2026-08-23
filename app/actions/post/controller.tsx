import { getCsrfToken } from "remix/middleware/csrf"
import { redirect } from "remix/response/redirect"
import { createController } from "remix/router"

import { createReport, findPublicReport } from "../../data/reports.ts"
import { requireAuth } from "../../middleware/auth.ts"
import { routes } from "../../routes.ts"
import { getCurrentUser } from "../../utils/context.ts"
import { notFound } from "../not-found.tsx"
import { NewReportPage } from "./new-report.tsx"
import { ReportDetailPage } from "./report-detail.tsx"
import { getSafeReportValues, parseCreateReportInput } from "./report-input.ts"

const PRIVATE_FORM_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
}

export const post = createController(routes.post, {
  actions: {
    create: {
      middleware: [requireAuth()],
      async handler(context) {
        let csrfToken = getCsrfToken(context)
        let parsed = parseCreateReportInput(context.formData)

        if (!parsed.success) {
          return context.render(
            <NewReportPage
              csrfToken={csrfToken}
              issues={parsed.issues}
              values={getSafeReportValues(context.formData)}
            />,
            { status: 422, headers: PRIVATE_FORM_HEADERS },
          )
        }

        let report = await createReport(context.db, parsed.value, {
          authorId: getCurrentUser().id,
          confirmedAt: new Date(),
        })

        return redirect(routes.post.show.href({ id: report.id }), 303)
      },
    },

    destroy: {
      middleware: [requireAuth()],
      handler() {
        return redirect(routes.home.href())
      },
    },

    edit: {
      middleware: [requireAuth()],
      handler(context) {
        return notFound(context.render)
      },
    },

    new: {
      middleware: [requireAuth()],
      handler(context) {
        return context.render(<NewReportPage csrfToken={getCsrfToken(context)} />, {
          headers: PRIVATE_FORM_HEADERS,
        })
      },
    },

    update: {
      middleware: [requireAuth()],
      handler() {
        return redirect(routes.home.href())
      },
    },

    async show(context) {
      let report = await findPublicReport(context.db, context.params.id)
      if (report == null) return notFound(context.render)

      return context.render(<ReportDetailPage report={report} />)
    },
  },
})
