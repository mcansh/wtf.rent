import type { Handle, RemixNode } from "remix/ui"

import type { PublicCommentPage } from "../../data/comments.ts"
import type { PublicReportDetail } from "../../data/reports.ts"
import { routes } from "../../routes.ts"
import { ShellPage } from "../../ui/shell.tsx"
import type { CommentFormState } from "./report-comments.tsx"
import { ReportComments } from "./report-comments.tsx"
import { REPORT_CATEGORY_LABELS } from "./report-input.ts"

interface ReportDetailPageProps {
  canEdit: boolean
  commentForm: CommentFormState | null
  commentPage: PublicCommentPage
  report: PublicReportDetail
}

export function ReportDetailPage(handle: Handle<ReportDetailPageProps>) {
  return () => {
    let report = handle.props.report
    let categoryLabel = report.category == null ? null : REPORT_CATEGORY_LABELS[report.category]
    let place = [report.city, report.region].filter((part) => part != null).join(", ")
    let hasStructuredDetails =
      place.length > 0 ||
      report.landlordName != null ||
      categoryLabel != null ||
      report.rating != null ||
      report.experienceConfirmedAt != null

    return (
      <ShellPage title={`${report.title} · wtf.rent`}>
        <main className="bg-paper-50 min-h-dvh">
          <header className="border-ink-950 border-b-2 bg-blue-100">
            <div className="mx-auto grid w-full max-w-6xl gap-7 px-4 py-9 sm:px-8 sm:py-12 lg:gap-9 lg:py-16">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <a
                  className="focus-visible:outline-ink-950 w-fit text-base font-semibold underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 sm:text-sm"
                  href={routes.home.href()}
                >
                  <span aria-hidden="true">←</span> Back to renter reports
                </a>
                {handle.props.canEdit ? (
                  <a
                    className="border-ink-950 bg-paper-50 hover:bg-acid-100 focus-visible:outline-ink-950 border-[1.5px] px-3 py-2 text-base font-semibold shadow-[3px_3px_0_var(--color-ink-950)] focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-sm"
                    href={routes.post.edit.href({ id: report.id })}
                  >
                    Edit report
                  </a>
                ) : null}
              </div>

              <div className="grid max-w-4xl gap-4">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-medium tracking-wide uppercase">
                  <span className="border-ink-950 bg-acid-100 border px-2 py-1">
                    {categoryLabel ?? "Legacy report"}
                  </span>
                  <span>Public rental record</span>
                </div>
                <h1 className="font-serif text-4xl leading-[0.98] font-semibold tracking-tight text-balance break-words sm:text-6xl lg:text-7xl">
                  {report.title}
                </h1>
                <p className="text-base sm:text-lg">
                  Report by <strong className="break-words">@{report.username}</strong>
                </p>
              </div>
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,7fr)_minmax(17rem,3fr)] lg:items-start lg:gap-12 lg:py-18">
            <article className="grid min-w-0 gap-8">
              <div className="grid gap-3">
                <p className="font-mono text-xs font-medium tracking-wide uppercase">The report</p>
                <p className="text-lg/8 break-words whitespace-pre-wrap sm:text-xl/9">
                  {report.content}
                </p>
              </div>

              <footer className="border-ink-950 grid gap-2 border-t-2 pt-5 text-base sm:text-sm">
                <p>
                  Published <ReportDate value={report.createdAt} />
                </p>
                <p className="max-w-[62ch] text-pretty">
                  Renter reports are personal firsthand accounts. Read them alongside local records
                  and your own inspection.
                </p>
              </footer>
            </article>

            <aside
              className="border-ink-950 shadow-ink-950 bg-paper-50 grid gap-5 border-2 p-5 shadow-[6px_6px_0_var(--color-ink-950)] sm:p-6"
              aria-labelledby="report-details-heading"
            >
              <div className="grid gap-1">
                <p className="font-mono text-xs font-medium tracking-wide uppercase">
                  On the record
                </p>
                <h2
                  id="report-details-heading"
                  className="font-serif text-2xl font-semibold tracking-tight"
                >
                  Report details
                </h2>
              </div>

              {hasStructuredDetails ? (
                <dl className="border-ink-950/20 grid gap-5 border-t pt-5">
                  {report.rating == null ? null : (
                    <DetailItem term="Overall rating">
                      <Rating value={report.rating} />
                    </DetailItem>
                  )}
                  {categoryLabel == null ? null : (
                    <DetailItem term="Category">{categoryLabel}</DetailItem>
                  )}
                  {place.length === 0 ? null : <DetailItem term="Location">{place}</DetailItem>}
                  {report.landlordName == null ? null : (
                    <DetailItem term="Landlord or property manager">
                      {report.landlordName}
                    </DetailItem>
                  )}
                  {report.experienceConfirmedAt == null ? null : (
                    <DetailItem term="Firsthand confirmation">
                      <ReportDate value={report.experienceConfirmedAt} />
                    </DetailItem>
                  )}
                </dl>
              ) : (
                <p className="border-ink-950/20 border-t pt-5 text-base/7 text-pretty sm:text-sm/6">
                  This report predates structured report details, so no city or region, category,
                  rating, landlord, or confirmation date is available.
                </p>
              )}
            </aside>
          </div>
          <ReportComments
            commentPage={handle.props.commentPage}
            form={handle.props.commentForm}
            reportId={report.id}
          />
        </main>
      </ShellPage>
    )
  }
}

function DetailItem(handle: Handle<{ children: RemixNode; term: string }>) {
  return () => (
    <div className="grid gap-1">
      <dt className="font-mono text-xs font-medium tracking-wide uppercase">{handle.props.term}</dt>
      <dd className="text-base font-semibold break-words">{handle.props.children}</dd>
    </div>
  )
}

function Rating(handle: Handle<{ value: number }>) {
  return () => (
    <span className="flex flex-wrap items-center gap-2">
      <span aria-label={`${handle.props.value} out of 5 rating`}>
        <span className="tracking-tight" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (index < handle.props.value ? "★" : "☆")).join(
            "",
          )}
        </span>
      </span>
      <span className="font-mono text-xs font-medium">{handle.props.value} / 5</span>
    </span>
  )
}

function ReportDate(handle: Handle<{ value: Date }>) {
  return () => (
    <time dateTime={handle.props.value.toISOString()}>{formatReportDate(handle.props.value)}</time>
  )
}

function formatReportDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(value)
}
