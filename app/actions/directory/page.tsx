import type { Handle } from "remix/ui"

import type { PublicDirectoryEntry, PublicDirectoryPage } from "../../data/directory.ts"
import { routes } from "../../routes.ts"
import type { DirectoryInput } from "./input.ts"

interface DirectoryPageProps {
  directoryPage: PublicDirectoryPage
  input: DirectoryInput
}

export function DirectoryPage(handle: Handle<DirectoryPageProps>) {
  return () => {
    let { directoryPage, input } = handle.props
    let resultStart = (directoryPage.page - 1) * directoryPage.pageSize + 1
    let resultEnd = resultStart + directoryPage.entries.length - 1

    return (
      <main className="bg-paper-50 text-ink-950 isolate min-h-dvh overflow-hidden antialiased">
        <section className="border-ink-950 border-b-2 bg-blue-200 py-12 sm:py-14 lg:py-16">
          <div className="mx-auto grid max-w-7xl gap-7 px-5 sm:px-8 lg:grid-cols-[13fr_7fr] lg:items-end lg:gap-12 lg:px-12">
            <div className="grid gap-4">
              <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
                Landlords and property managers
              </p>
              <h1 className="max-w-[24ch] font-serif text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
                Browse the public record
              </h1>
              <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
                Find landlords and property managers named in published renter reports, grouped by
                city and region.
              </p>
            </div>

            <form
              className="grid gap-3"
              method="get"
              action={routes.directory.href()}
              role="search"
            >
              <label className="font-medium" htmlFor="directory-search">
                Search the directory
              </label>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  id="directory-search"
                  className="border-ink-950 bg-paper-50 placeholder:text-ink-600 min-h-12 min-w-0 border-[1.5px] px-3 text-base focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-600 sm:text-sm"
                  name="q"
                  type="search"
                  defaultValue={input.q}
                  maxLength={100}
                  enterKeyHint="search"
                  placeholder="Landlord, city, or region"
                />
                <button
                  className="border-ink-950 bg-acid-100 hover:bg-acid-200 min-h-12 border-[1.5px] px-3 py-2 font-semibold shadow-[3px_3px_0_var(--color-ink-950)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  type="submit"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="py-10 sm:py-12 lg:py-16" aria-labelledby="directory-results-heading">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <header className="border-ink-950 flex flex-wrap items-end justify-between gap-4 border-b-2 pb-5">
              <div className="grid gap-2">
                <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
                  {input.q ? "Search results" : "Public directory"}
                </p>
                <h2
                  id="directory-results-heading"
                  className="max-w-[35ch] font-serif text-4xl font-semibold tracking-tight text-balance"
                >
                  {input.q ? `Matches for “${input.q}”` : "Landlords on the record"}
                </h2>
              </div>

              {input.q ? (
                <a
                  className="text-base font-semibold underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:text-sm"
                  href={directoryHref("", 1)}
                >
                  Clear search
                </a>
              ) : null}
            </header>

            {directoryPage.entries.length > 0 ? (
              <>
                <p className="border-ink-950/15 border-b py-4 text-base/7 text-pretty sm:text-sm/6">
                  Showing {resultStart}–{resultEnd} of {directoryPage.total}{" "}
                  {directoryEntryLabel(directoryPage.total)}
                  {input.q ? ` matching “${input.q}”` : ""}.
                </p>

                <ul className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
                  {directoryPage.entries.map((entry) => (
                    <DirectoryEntryCard key={directoryEntryKey(entry)} entry={entry} />
                  ))}
                </ul>
              </>
            ) : (
              <EmptyDirectory input={input} directoryPage={directoryPage} />
            )}

            {directoryPage.entries.length > 0 && directoryPage.totalPages > 0 ? (
              <nav
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 pt-2"
                aria-label="Directory pages"
              >
                {directoryPage.hasPreviousPage ? (
                  <a
                    className="border-ink-950 bg-paper-50 inline-flex min-h-12 w-fit items-center border-[1.5px] px-3 py-2 font-semibold hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    href={directoryHref(input.q, directoryPage.page - 1)}
                    rel="prev"
                  >
                    <span aria-hidden="true">←</span>&nbsp; Previous
                  </a>
                ) : (
                  <span aria-hidden="true" />
                )}
                <span className="font-mono text-base font-medium tabular-nums sm:text-sm">
                  Page {directoryPage.page} of {directoryPage.totalPages}
                </span>
                {directoryPage.hasNextPage ? (
                  <a
                    className="border-ink-950 bg-paper-50 inline-flex min-h-12 items-center justify-self-end border-[1.5px] px-3 py-2 font-semibold hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    href={directoryHref(input.q, directoryPage.page + 1)}
                    rel="next"
                  >
                    Next&nbsp; <span aria-hidden="true">→</span>
                  </a>
                ) : (
                  <span aria-hidden="true" />
                )}
              </nav>
            ) : null}
          </div>
        </section>
      </main>
    )
  }
}

function DirectoryEntryCard(handle: Handle<{ entry: PublicDirectoryEntry }>) {
  return () => {
    let { entry } = handle.props

    return (
      <li>
        <a
          className="border-ink-950 bg-paper-50 hover:bg-acid-50 grid h-full gap-5 border-[1.5px] p-5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blue-600"
          href={reportFeedHref(entry.landlordName)}
        >
          <div className="flex min-w-0 items-start justify-between gap-4">
            <h3 className="max-w-[40ch] min-w-0 font-serif text-2xl font-semibold tracking-tight text-balance">
              {entry.landlordName}
            </h3>
            <span className="shrink-0 text-2xl" aria-hidden="true">
              →
            </span>
          </div>
          <dl className="border-ink-950/15 grid gap-3 border-t pt-4">
            <div className="flex min-w-0 items-baseline justify-between gap-4">
              <dt className="font-medium">Location</dt>
              <dd className="text-ink-700 min-w-0 text-right">{formatLocation(entry)}</dd>
            </div>
            <div className="flex min-w-0 items-baseline justify-between gap-4">
              <dt className="font-medium">On the record</dt>
              <dd className="text-ink-700 min-w-0 text-right tabular-nums">
                {entry.reportCount} public {entry.reportCount === 1 ? "report" : "reports"}
              </dd>
            </div>
          </dl>
        </a>
      </li>
    )
  }
}

function EmptyDirectory(
  handle: Handle<{ directoryPage: PublicDirectoryPage; input: DirectoryInput }>,
) {
  return () => {
    let { directoryPage, input } = handle.props
    let isOutOfRange = directoryPage.total > 0

    return (
      <div className="border-ink-950 mt-7 grid justify-items-start gap-4 border-[1.5px] bg-blue-100 p-6 sm:p-8">
        <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
          Nothing on this page
        </p>
        <h3 className="max-w-[40ch] font-serif text-3xl font-semibold tracking-tight text-balance">
          {isOutOfRange
            ? `Page ${directoryPage.page} is beyond the available directory.`
            : input.q
              ? `No directory entries match “${input.q}”.`
              : "No directory entries have been published yet."}
        </h3>
        <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
          {isOutOfRange
            ? `There ${directoryPage.total === 1 ? "is" : "are"} ${directoryPage.total} ${directoryEntryLabel(directoryPage.total)} on the record.`
            : input.q
              ? "Try another landlord, property manager, city, or region."
              : "The directory grows from published renter reports. Share the first useful record."}
        </p>
        <div className="flex flex-wrap gap-4 font-semibold">
          {isOutOfRange || input.q ? (
            <a
              className="underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              href={directoryHref("", 1)}
            >
              {isOutOfRange ? "Back to the first page" : "Clear search"}
            </a>
          ) : null}
          <a
            className="underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            href={routes.post.new.href()}
          >
            Share a renter report
          </a>
        </div>
      </div>
    )
  }
}

function directoryHref(query: string, page: number): string {
  let searchParams = new URLSearchParams()
  if (query.length > 0) searchParams.set("q", query)
  if (page > 1) searchParams.set("page", String(page))

  let search = searchParams.toString()
  return `${routes.directory.href()}${search.length > 0 ? `?${search}` : ""}`
}

function reportFeedHref(landlordName: string): string {
  let searchParams = new URLSearchParams({ q: landlordName })
  return `${routes.home.href()}?${searchParams.toString()}#feed`
}

function directoryEntryKey(entry: PublicDirectoryEntry): string {
  return `${entry.landlordName}\u0000${entry.city ?? ""}\u0000${entry.region ?? ""}`
}

function formatLocation(entry: Pick<PublicDirectoryEntry, "city" | "region">): string {
  if (entry.city && entry.region) return `${entry.city}, ${entry.region}`
  return entry.city ?? entry.region ?? "Location unavailable"
}

function directoryEntryLabel(count: number): string {
  return count === 1 ? "directory entry" : "directory entries"
}
