import { getCsrfToken } from "remix/middleware/csrf"
import { redirect } from "remix/response/redirect"
import { createController } from "remix/router"

import { createComment, listPublicComments } from "../../data/comments.ts"
import {
  createReport,
  findEditableReport,
  findPublicReport,
  updateReport,
} from "../../data/reports.ts"
import { requireAuth } from "../../middleware/auth.ts"
import { routes } from "../../routes.ts"
import { getCurrentUser, getCurrentUserSafely } from "../../utils/context.ts"
import { notFound } from "../not-found.tsx"
import { getSafeCommentValue, parseCommentCursor, parseCommentInput } from "./comment-input.ts"
import { EditReportPage } from "./edit-report.tsx"
import { NewReportPage } from "./new-report.tsx"
import { ReportDetailPage } from "./report-detail.tsx"
import {
  getSafeReportValues,
  parseCreateReportInput,
  parseUpdateReportInput,
} from "./report-input.ts"

export const post = createController(routes.post, {
  actions: {
    comment: {
      middleware: [requireAuth({ returnTo: routes.post.show })],
      async handler(context) {
        let report = await findPublicReport(context.params.id)
        if (report == null) return notFound(context.render)

        let currentUser = getCurrentUser()
        let parsed = parseCommentInput(context.formData)
        if (!parsed.success) {
          let commentPage = await listPublicComments(
            context.db,
            report.id,
            parseCommentCursor(context.url.searchParams),
          )
          return context.render(
            <ReportDetailPage
              canEdit={currentUser.username === report.username}
              commentPage={commentPage}
              commentForm={{
                csrfToken: getCsrfToken(context),
                issues: parsed.issues,
                value: getSafeCommentValue(context.formData),
              }}
              report={report}
            />,
            privateRenderInit(422),
          )
        }

        let comment = await createComment(context.db, report.id, parsed.value.content, {
          authorId: currentUser.id,
        })
        if (comment == null) return notFound(context.render)

        return redirect(routes.post.show.href({ id: report.id }), 303)
      },
    },

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
            privateRenderInit(422),
          )
        }

        let report = await createReport(parsed.value, {
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
      async handler(context) {
        let report = await findEditableReport(context.params.id, getCurrentUser().id)
        if (report == null) return notFound(context.render)

        return context.render(
          <EditReportPage csrfToken={getCsrfToken(context)} report={report} />,
          privateRenderInit(),
        )
      },
    },

    new: {
      middleware: [requireAuth()],
      handler(context) {
        return context.render(
          <NewReportPage csrfToken={getCsrfToken(context)} />,
          privateRenderInit(),
        )
      },
    },

    update: {
      middleware: [requireAuth()],
      async handler(context) {
        let currentUser = getCurrentUser()
        let report = await findEditableReport(context.params.id, currentUser.id)
        if (report == null) return notFound(context.render)

        let parsed = parseUpdateReportInput(context.formData)
        if (!parsed.success) {
          return context.render(
            <EditReportPage
              csrfToken={getCsrfToken(context)}
              issues={parsed.issues}
              report={report}
              values={getSafeReportValues(context.formData)}
            />,
            privateRenderInit(422),
          )
        }

        let updated = await updateReport(report.id, parsed.value, {
          authorId: currentUser.id,
          confirmedAt: new Date(),
        })
        if (updated == null) return notFound(context.render)

        return redirect(routes.post.show.href({ id: updated.id }), 303)
      },
    },

    async show(context) {
      let report = await findPublicReport(context.params.id)
      if (report == null) return notFound(context.render)

      let currentUser = getCurrentUserSafely()
      let commentPage = await listPublicComments(
        context.db,
        report.id,
        parseCommentCursor(context.url.searchParams),
      )

      return context.render(
        <ReportDetailPage
          canEdit={currentUser?.username === report.username}
          commentPage={commentPage}
          commentForm={
            currentUser == null
              ? null
              : {
                  csrfToken: getCsrfToken(context),
                }
          }
          report={report}
        />,
        currentUser == null ? { headers: { Vary: "Cookie" } } : privateRenderInit(),
      )
    },
  },
})

function privateRenderInit(status?: number): ResponseInit {
  return {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  }
}
