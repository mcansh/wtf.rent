import type { Handle, SerializableObject } from "remix/ui"

import { routes } from "../../../routes.ts"

const REPORT_EXCERPT_LENGTH = 280
const REPORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
})

export interface ClientReportSummary extends SerializableObject {
  categoryLabel: string | null
  city: string | null
  content: string
  createdAt: string
  id: string
  landlordName: string | null
  rating: number | null
  region: string | null
  title: string
  username: string
}

export function ReportCard(handle: Handle<{ report: ClientReportSummary }>) {
  return () => {
    let report = handle.props.report
    let place =
      report.city != null && report.region != null
        ? `${report.city}, ${report.region}`
        : (report.city ?? report.region)
    let detailHref = routes.post.show.href({ id: report.id })

    return (
      <article className="border-ink-950/35 grid grid-cols-[36px_minmax(0,1fr)] gap-3 border-b py-6 min-[541px]:grid-cols-[42px_minmax(0,1fr)] min-[541px]:gap-4">
        <div
          className="border-ink-950 bg-acid-100 grid size-9 place-items-center border font-mono text-[10px] font-medium uppercase min-[541px]:size-10.5 min-[541px]:text-xs"
          aria-hidden="true"
        >
          {report.username.slice(0, 2)}
        </div>

        <div className="grid min-w-0 gap-3">
          <div className="text-ink-700 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <strong className="text-ink-950 break-words">@{report.username}</strong>
            <span aria-hidden="true">·</span>
            <time dateTime={report.createdAt}>{formatReportDate(report.createdAt)}</time>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="border-ink-950 bg-coral-100 border px-2 py-1 font-mono text-[9px] font-medium tracking-wide uppercase">
              {report.categoryLabel ?? "Legacy report"}
            </span>
            {report.rating == null ? null : <ReportRating value={report.rating} />}
          </div>

          <div className="grid gap-2">
            <h3 className="font-serif text-[23px] leading-[1.05] font-bold tracking-[-.5px] break-words min-[901px]:text-[25px]">
              <a
                className="decoration-2 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                href={detailHref}
              >
                {report.title}
              </a>
            </h3>
            <p className="font-mono text-[10px] font-medium tracking-wide uppercase">
              {place || "Location unavailable"}
            </p>
            <p className="max-w-[65ch] text-sm/6 text-pretty break-words">
              {getReportExcerpt(report.content)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            {report.landlordName == null ? null : (
              <p>
                Managed by <strong>{report.landlordName}</strong>
              </p>
            )}
            <a
              className="font-bold underline decoration-2 underline-offset-4"
              href={detailHref}
              aria-label={`Read full report: ${report.title}`}
            >
              Read full report <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </article>
    )
  }
}

function ReportRating(handle: Handle<{ value: number }>) {
  return () => (
    <span className="flex items-center gap-1.5">
      <span aria-label={`${handle.props.value} out of 5 rating`}>
        <span className="text-xs tracking-[-1px]" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (index < handle.props.value ? "★" : "☆")).join(
            "",
          )}
        </span>
      </span>
      <span className="font-mono text-[10px] font-medium">{handle.props.value} / 5</span>
    </span>
  )
}

function getReportExcerpt(content: string): string {
  let normalized = content.replaceAll(/\s+/g, " ").trim()
  if (normalized.length <= REPORT_EXCERPT_LENGTH) return normalized

  return `${normalized.slice(0, REPORT_EXCERPT_LENGTH - 1).trimEnd()}…`
}

function formatReportDate(value: string): string {
  return REPORT_DATE_FORMATTER.format(new Date(value))
}
