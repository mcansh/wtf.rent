import type { Handle, SerializableObject } from "remix/ui"

import { routes } from "../../../routes.ts"
import { ReportSearch } from "./report-search.tsx"
import type { ClientReportSummary } from "./review.tsx"
import { ReportCard } from "./review.tsx"

export interface ClientReportPage extends SerializableObject {
  hasNextPage: boolean
  hasPreviousPage: boolean
  page: number
  pageSize: number
  reports: ClientReportSummary[]
  total: number
  totalPages: number
}

interface HomePageProps {
  query: string
  reportPage: ClientReportPage
  radius: string
  lat: string
  lng: string
}

export function HomePage(handle: Handle<HomePageProps>) {
  return () => {
    let { query, reportPage, radius, lat, lng } = handle.props
    let resultStart = (reportPage.page - 1) * reportPage.pageSize + 1
    let resultEnd = resultStart + reportPage.reports.length - 1

    return (
      <main className="bg-paper-50 text-ink-950 min-h-screen overflow-hidden">
        <section
          className="border-ink-950 border-b-2 bg-blue-200 px-5 pt-13 pb-12 min-[541px]:px-[8vw] min-[541px]:pt-15 min-[901px]:grid min-[901px]:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)] min-[901px]:gap-[6vw] min-[901px]:px-[12.5vw] min-[901px]:pt-18 min-[901px]:pb-16"
          id="top"
        >
          <div>
            <p className="mb-3 font-mono text-[10px] font-medium tracking-[1.1px] uppercase">
              The rental record, made public
            </p>
            <h1 className="m-0 font-serif text-[54px] leading-[.86] font-extrabold tracking-[-2.6px] text-balance min-[541px]:text-[clamp(58px,7vw,78px)] min-[901px]:text-[clamp(50px,6.1vw,88px)] min-[901px]:tracking-[-4px]">
              What’s it really
              <br />
              <em className="font-bold">like</em> living there?
            </h1>
            <p className="mt-5 mb-6 max-w-105 text-base leading-[1.35] text-pretty min-[901px]:mt-6 min-[901px]:text-[17px]">
              Firsthand reports from renters. The good, the bad, and the landlord specials.
            </p>

            <ReportSearch query={query} radius={radius} lat={lat} lng={lng} />

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
              <a
                className="border-ink-950 bg-coral-400 hover:bg-coral-300 focus-visible:outline-ink-950 inline-flex border-[1.5px] px-4 py-2.5 font-bold shadow-[3px_3px_0_var(--color-ink-950)] focus-visible:outline-2 focus-visible:outline-offset-3"
                href={routes.post.new.href()}
              >
                Share your report <span aria-hidden="true">→</span>
              </a>
              <a
                className="font-semibold underline decoration-2 underline-offset-4"
                href="#how-it-works"
              >
                How the record works
              </a>
            </div>
          </div>

          <div
            className="border-ink-950 bg-coral-400 shadow-ink-950 after:bg-acid-100 after:border-ink-950 relative hidden aspect-[1/1.12] w-full max-w-67.5 rotate-[4deg] flex-col justify-between self-center border-2 p-4.5 shadow-[9px_9px_0_var(--color-ink-950)] after:absolute after:-top-7 after:-right-5 after:-z-10 after:size-19.5 after:rounded-full after:border-2 min-[901px]:flex"
            aria-label="Tenant-made poster"
          >
            <p className="my-1 font-serif text-[50px] leading-[.78] font-extrabold tracking-[-3px]">
              KEEP
              <br />
              YOUR
              <br />
              <span className="text-[39px] italic">RECEIPTS.</span>
            </p>
            <small className="font-mono text-[8px] leading-[1.2]">
              A PUBLIC SERVICE REMINDER
              <br />
              FROM YOUR FELLOW RENTERS
            </small>
          </div>
        </section>

        <div className="border-ink-950 bg-acid-100 flex min-h-11 items-center justify-center border-b-2 px-5 py-2 text-center font-mono text-[10px] tracking-[.5px] uppercase">
          {reportPage.total} public {pluralize(reportPage.total, "report")} on the record
          <span className="mx-3" aria-hidden="true">
            •
          </span>
          Searchable by landlord, city, region, category, and experience
        </div>

        <section
          className="grid px-5 pt-10 pb-16 min-[541px]:px-[7vw] min-[541px]:pt-12 min-[541px]:pb-20 min-[901px]:grid-cols-[260px_minmax(0,720px)] min-[901px]:justify-center min-[901px]:gap-17.5 min-[901px]:px-[5vw] min-[901px]:pt-15"
          id="feed"
        >
          <aside
            className="hidden content-start gap-6 min-[901px]:grid"
            aria-label="About this feed"
          >
            <section className="border-ink-950 bg-paper-50 grid gap-3 border-[1.5px] p-5">
              <p className="font-mono text-[10px] font-medium tracking-[1.1px] uppercase">
                On the record
              </p>
              <p className="font-serif text-5xl leading-none font-extrabold tabular-nums">
                {reportPage.total}
              </p>
              <p className="text-sm leading-5">
                {query
                  ? `${pluralize(reportPage.total, "report")} matching this search.`
                  : `${pluralize(reportPage.total, "public report")} shared by renters.`}
              </p>
            </section>

            <section
              className="border-ink-950 bg-coral-100 grid gap-3 border-[1.5px] p-5"
              id="how-it-works"
            >
              <p className="font-mono text-[10px] font-medium tracking-[1.1px] uppercase">
                Read with context
              </p>
              <h2 className="font-serif text-2xl leading-none font-bold">One renter’s record.</h2>
              <p className="text-sm leading-5">
                Reports are firsthand accounts. Compare them with local records and your own
                inspection.
              </p>
            </section>
          </aside>

          <section className="mx-auto w-full max-w-180" aria-labelledby="feed-heading">
            <header className="border-ink-950 flex flex-wrap items-end justify-between gap-4 border-b-2 pb-5">
              <div className="grid gap-2">
                <p className="font-mono text-[10px] font-medium tracking-[1.1px] uppercase">
                  {query ? "Search the record" : "The latest"}
                </p>
                <h2
                  id="feed-heading"
                  className="m-0 font-serif text-[37px] leading-[.9] font-extrabold tracking-[-1.7px] min-[901px]:text-[42px]"
                >
                  {query ? "Search results" : "Latest reports"}
                </h2>
              </div>

              {query ? (
                <a
                  className="text-sm font-semibold underline decoration-2 underline-offset-4"
                  href={feedHref("", 1, radius, lat, lng)}
                >
                  Clear search
                </a>
              ) : null}
            </header>

            {reportPage.reports.length > 0 ? (
              <>
                <p className="border-ink-950/30 border-b py-4 text-sm">
                  Showing {resultStart}–{resultEnd} of {reportPage.total}{" "}
                  {pluralize(reportPage.total, "report")}
                  {query ? ` matching “${query}”` : ""}.
                </p>
                <div>
                  {reportPage.reports.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              </>
            ) : (
              <EmptyFeed query={query} reportPage={reportPage} radius={radius} lat={lat} lng={lng} />
            )}

            {reportPage.reports.length > 0 && reportPage.totalPages > 0 ? (
              <nav
                className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3"
                aria-label="Report pages"
              >
                {reportPage.hasPreviousPage ? (
                  <a
                    className="border-ink-950 bg-paper-50 hover:bg-acid-50 focus-visible:outline-ink-950 w-fit border-[1.5px] px-3 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-3"
                    href={feedHref(query, reportPage.page - 1, radius, lat, lng)}
                    rel="prev"
                  >
                    <span aria-hidden="true">←</span> Previous
                  </a>
                ) : (
                  <span />
                )}
                <span className="font-mono text-xs font-medium tabular-nums">
                  Page {reportPage.page} of {reportPage.totalPages}
                </span>
                {reportPage.hasNextPage ? (
                  <a
                    className="border-ink-950 bg-acid-100 hover:bg-acid-200 focus-visible:outline-ink-950 justify-self-end border-[1.5px] px-3 py-2 text-sm font-bold shadow-[3px_3px_0_var(--color-ink-950)] focus-visible:outline-2 focus-visible:outline-offset-3"
                    href={feedHref(query, reportPage.page + 1, radius, lat, lng)}
                    rel="next"
                  >
                    Next <span aria-hidden="true">→</span>
                  </a>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </section>
        </section>
      </main>
    )
  }
}

function EmptyFeed(
  handle: Handle<{ query: string; reportPage: ClientReportPage; radius: string; lat: string; lng: string }>,
) {
  return () => {
    let { query, reportPage, radius, lat, lng } = handle.props
    let isOutOfRange = reportPage.total > 0

    return (
      <div className="border-ink-950 mt-7 grid justify-items-start gap-4 border-[1.5px] bg-blue-100 p-6 sm:p-8">
        <p className="font-mono text-[10px] font-medium tracking-[1.1px] uppercase">
          Nothing on this page
        </p>
        <h3 className="font-serif text-3xl leading-none font-bold tracking-tight text-balance">
          {isOutOfRange
            ? `Page ${reportPage.page} is beyond the available reports.`
            : query
              ? `No reports match “${query}”.`
              : "No renter reports have been published yet."}
        </h3>
        <p className="max-w-[54ch] text-base/7 text-pretty sm:text-sm/6">
          {isOutOfRange
            ? `There ${reportPage.total === 1 ? "is" : "are"} ${reportPage.total} ${pluralize(reportPage.total, "report")} on the record.`
            : "Try another landlord, city, region, category, or experience—or add the first useful record."}
        </p>
        <div className="flex flex-wrap gap-4 text-sm font-semibold">
          {isOutOfRange ? (
            <a
              className="underline decoration-2 underline-offset-4"
              href={feedHref(query, 1, radius, lat, lng)}
            >
              Back to the first page
            </a>
          ) : query ? (
            <a
              className="underline decoration-2 underline-offset-4"
              href={feedHref("", 1, radius, lat, lng)}
            >
              Clear search
            </a>
          ) : null}
          <a className="underline decoration-2 underline-offset-4" href={routes.post.new.href()}>
            Share a renter report
          </a>
        </div>
      </div>
    )
  }
}

function feedHref(query: string, page: number, radius: string, lat: string, lng: string): string {
  let searchParams = new URLSearchParams()
  if (query.length > 0) searchParams.set("q", query)
  if (page > 1) searchParams.set("page", String(page))
  if (radius) searchParams.set("radius", radius)
  if (lat) searchParams.set("lat", lat)
  if (lng) searchParams.set("lng", lng)

  let search = searchParams.toString()
  return `${routes.home.href()}${search.length > 0 ? `?${search}` : ""}#feed`
}

function pluralize(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`
}
