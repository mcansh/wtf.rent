import type { Handle } from "remix/ui"

import { routes } from "../../routes.ts"

const RECORD_STEPS = [
  {
    number: "01",
    title: "A signed-in renter contributes",
    body: "A valid report publishes immediately and identifies its contributor by public username.",
  },
  {
    number: "02",
    title: "Useful context becomes searchable",
    body: "Readers can find firsthand accounts through landlord or property-manager name, city, region, housing category, and experience.",
  },
  {
    number: "03",
    title: "Readers do their own checking",
    body: "One report is a starting point. Compare it with other accounts, current local records, and your own inspection.",
  },
] as const

const PUBLIC_DETAILS = [
  "Public username",
  "Landlord or property-manager name",
  "City and region",
  "Report title and firsthand account",
  "Category, rating, and applicable dates",
] as const

const PRIVATE_DETAILS = [
  "Account email and password data",
  "The dedicated street-address field",
  "Reports whose visibility is hidden",
] as const

const SHARING_STANDARDS = [
  "Share only a firsthand rental experience.",
  "Stick to relevant, supportable details and distinguish observation from opinion.",
  "Remove unit details, contact information, and other tenants’ names before publishing.",
  "Keep records privately when they may help explain what happened.",
] as const

export function AboutPage() {
  return () => (
    <main className="bg-paper-50 text-ink-950 isolate min-h-dvh overflow-hidden antialiased">
      <AboutHero />
      <RecordProcess />
      <PrivacyBoundary />
      <PublishingStandards />
      <ReadingContext />
    </main>
  )
}

function AboutHero() {
  return () => (
    <section className="border-ink-950 border-b-2 bg-blue-200 py-12 sm:py-14 lg:py-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[13fr_7fr] lg:items-end lg:gap-12 lg:px-12">
        <div className="grid gap-5">
          <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
            Why this exists
          </p>
          <h1 className="max-w-[24ch] font-serif text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
            A public record renters can use
          </h1>
          <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
            wtf.rent helps renters share firsthand experiences and makes landlord, property-manager,
            city, region, and housing-category context easier to find.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              className="border-ink-950 bg-acid-100 hover:bg-acid-200 inline-flex min-h-12 items-center border-[1.5px] py-2 pr-3 pl-4 font-semibold shadow-[3px_3px_0_var(--color-ink-950)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blue-600"
              href={`${routes.home.href()}#feed`}
            >
              Read renter reports <span aria-hidden="true">→</span>
            </a>
            <a
              className="inline-flex min-h-11 items-center font-semibold underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              href={routes.directory.href()}
            >
              Browse the Directory
            </a>
          </div>
        </div>

        <aside className="border-ink-950 bg-coral-100 grid gap-3 border-[1.5px] p-5 sm:p-6">
          <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
            The short version
          </p>
          <p className="max-w-[40ch] font-serif text-3xl font-semibold tracking-tight text-balance">
            One account is context. A pattern is a lead. Neither is proof.
          </p>
        </aside>
      </div>
    </section>
  )
}

function RecordProcess() {
  return () => (
    <section className="py-12 sm:py-14 lg:py-16" aria-labelledby="record-process-heading">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <header className="border-ink-950 grid gap-4 border-b-2 pb-6 lg:grid-cols-[13fr_7fr] lg:items-end lg:gap-12">
          <div className="grid gap-3">
            <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
              From experience to record
            </p>
            <h2
              id="record-process-heading"
              className="max-w-[35ch] font-serif text-4xl font-semibold tracking-tight text-balance"
            >
              How the record works
            </h2>
          </div>
          <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
            Reports come from renters, not from a property score or an official case file. Read each
            one as a person’s account of what happened.
          </p>
        </header>

        <dl className="grid lg:grid-cols-3">
          {RECORD_STEPS.map((step, index) => (
            <div
              key={step.number}
              className={`grid content-start gap-4 py-7 lg:px-6 lg:py-8 ${index > 0 ? "border-ink-950/15 border-t lg:border-t-0 lg:border-l" : "lg:pl-0"} ${index === RECORD_STEPS.length - 1 ? "lg:pr-0" : ""}`}
            >
              <dt className="grid max-w-[40ch] gap-4">
                <span
                  className="font-mono text-base font-medium tabular-nums sm:text-sm"
                  aria-hidden="true"
                >
                  {step.number}
                </span>
                <span className="font-serif text-2xl font-semibold tracking-tight text-balance">
                  {step.title}
                </span>
              </dt>
              <dd className="text-ink-700 max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
                {step.body}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function PrivacyBoundary() {
  return () => (
    <section
      className="border-ink-950 bg-paper-100 border-y-2 py-12 sm:py-14 lg:py-16"
      aria-labelledby="privacy-boundary-heading"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <header className="grid gap-4 lg:grid-cols-[13fr_7fr] lg:items-end lg:gap-12">
          <div className="grid gap-3">
            <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
              Privacy boundary
            </p>
            <h2
              id="privacy-boundary-heading"
              className="max-w-[35ch] font-serif text-4xl font-semibold tracking-tight text-balance"
            >
              What’s public—and what isn’t
            </h2>
          </div>
          <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
            City and region are the only structured location fields shown publicly. The dedicated
            building address follows a different path.
          </p>
        </header>

        <div className="border-ink-950 mt-7 grid border-[1.5px] lg:grid-cols-2">
          <DisclosureList title="On the public record" items={PUBLIC_DETAILS} />
          <DisclosureList
            title="Kept out of public pages and search"
            items={PRIVATE_DETAILS}
            divided
          />
        </div>

        <div className="border-ink-950 bg-coral-100 grid gap-3 border-x-[1.5px] border-b-[1.5px] p-5 sm:p-6 lg:grid-cols-[7fr_13fr] lg:gap-12">
          <p className="font-serif text-2xl font-semibold tracking-tight text-balance">
            Your part before publishing
          </p>
          <p className="max-w-[64ch] text-base/7 text-pretty sm:text-sm/6">
            Report text is public. Remove apartment or unit details, private contact information,
            and other tenants’ names before you submit it.
          </p>
        </div>

        <p className="text-ink-700 mt-5 max-w-[72ch] text-base/7 text-pretty sm:text-sm/6">
          A building-level street address is stored for internal report identification, but it is
          not selected by public queries, searched, serialized to public page data, or rendered.
        </p>
      </div>
    </section>
  )
}

interface DisclosureListProps {
  divided?: boolean
  items: readonly string[]
  title: string
}

function DisclosureList(handle: Handle<DisclosureListProps>) {
  return () => {
    let { divided = false, items, title } = handle.props

    return (
      <dl
        className={`grid content-start gap-5 p-5 sm:p-6 ${divided ? "border-ink-950/15 border-t lg:border-t-0 lg:border-l" : ""}`}
      >
        <dt className="font-serif text-2xl font-semibold tracking-tight text-balance">{title}</dt>
        <dd className="text-ink-700">
          <ul className="grid gap-3" role="list">
            {items.map((item) => (
              <li
                key={item}
                className="border-ink-950/15 grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-t pt-3 text-base/7 text-pretty sm:text-sm/6"
              >
                <span className="text-ink-950 font-mono" aria-hidden="true">
                  —
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </dd>
      </dl>
    )
  }
}

function PublishingStandards() {
  return () => (
    <section className="py-12 sm:py-14 lg:py-16" aria-labelledby="publishing-standards-heading">
      <div className="mx-auto grid max-w-7xl gap-7 px-5 sm:px-8 lg:grid-cols-[7fr_13fr] lg:gap-12 lg:px-12">
        <header className="grid content-start gap-3">
          <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
            Before you post
          </p>
          <h2
            id="publishing-standards-heading"
            className="max-w-[35ch] font-serif text-4xl font-semibold tracking-tight text-balance"
          >
            Standards for sharing
          </h2>
        </header>

        <ol className="border-ink-950 border-y-2" role="list">
          {SHARING_STANDARDS.map((standard, index) => (
            <li
              key={standard}
              className="border-ink-950/15 grid grid-cols-[auto_minmax(0,1fr)] gap-4 border-b py-5"
            >
              <span
                className="font-mono text-base font-medium tabular-nums sm:text-sm"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="max-w-[64ch] text-base/7 text-pretty sm:text-sm/6">{standard}</p>
            </li>
          ))}
          <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 py-5">
            <span
              className="font-mono text-base font-medium tabular-nums sm:text-sm"
              aria-hidden="true"
            >
              05
            </span>
            <p className="max-w-[64ch] text-base/7 text-pretty sm:text-sm/6">
              Use the{" "}
              <a
                className="font-semibold underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                href={routes.rights.href()}
              >
                Rights guide
              </a>{" "}
              to find current local rules and qualified help instead of treating a report as legal
              guidance.
            </p>
          </li>
        </ol>
      </div>
    </section>
  )
}

function ReadingContext() {
  return () => (
    <section
      className="bg-ink-950 text-paper-50 py-12 sm:py-14"
      aria-labelledby="reading-context-heading"
    >
      <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 lg:grid-cols-[13fr_7fr] lg:items-end lg:gap-12 lg:px-12">
        <div className="grid gap-4">
          <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
            The responsible read
          </p>
          <h2
            id="reading-context-heading"
            className="max-w-[35ch] font-serif text-4xl font-semibold tracking-tight text-balance"
          >
            Read every report with context
          </h2>
          <p className="text-paper-100 max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
            Experiences can be incomplete, disputed, or different from one renter to the next. Look
            for patterns without treating report volume, silence, or a rating as proof.
          </p>
          <p className="text-paper-100 max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
            Reports are not independently verified, and a report does not prove a legal violation.
            Check current local rules and seek qualified help when the stakes are high.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a
            className="text-acid-100 inline-flex min-h-11 items-center font-semibold underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
            href={routes.rights.href()}
          >
            Open the Rights guide
          </a>
          <a
            className="border-paper-50 hover:bg-paper-50 hover:text-ink-950 inline-flex min-h-12 items-center border-[1.5px] py-2 pr-3 pl-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blue-300"
            href={routes.post.new.href()}
          >
            Share your experience <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
