import type { Handle } from "remix/ui"

import type { RightsGuide, RightsGuideStep, RightsResource } from "./resources.ts"

interface RightsPageProps {
  guide: RightsGuide
}

export function RightsPage(handle: Handle<RightsPageProps>) {
  return () => {
    let { guide } = handle.props

    return (
      <main className="bg-paper-50 text-ink-950 isolate min-h-dvh overflow-hidden antialiased">
        <section className="border-ink-950 border-b-2 bg-blue-200 py-12 sm:py-14 lg:py-16">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[13fr_7fr] lg:items-end lg:gap-12 lg:px-12">
            <div className="grid gap-5">
              <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
                A renter’s field guide
              </p>
              <h1 className="max-w-[24ch] font-serif text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
                Know where your rights start
              </h1>
              <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
                Rental rules vary by location and housing program. Use this guide to organize what
                happened, find the rules that apply, and reach qualified help.
              </p>
            </div>

            <aside
              className="border-ink-950 bg-coral-100 grid gap-3 border-[1.5px] p-5 sm:p-6"
              aria-labelledby="urgent-help-heading"
            >
              <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
                Time-sensitive
              </p>
              <h2
                id="urgent-help-heading"
                className="max-w-[40ch] font-serif text-2xl font-semibold tracking-tight text-balance"
              >
                {guide.urgentHelp.title}
              </h2>
              <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
                {guide.urgentHelp.body}
              </p>
            </aside>
          </div>
        </section>

        <nav className="border-ink-950 bg-acid-100 border-b-2" aria-label="On this page">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <ul className="grid sm:grid-cols-2 lg:grid-cols-5" role="list">
              {guide.steps.map((step) => (
                <li
                  key={step.id}
                  className="border-ink-950/15 border-b sm:nth-[2]:border-l sm:nth-[4]:border-l lg:border-b-0 lg:border-l lg:first:border-l-0"
                >
                  <a
                    className="hover:bg-acid-200 flex min-h-12 items-center gap-2 px-3 py-3 font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
                    href={`#${step.id}`}
                  >
                    <span className="font-mono tabular-nums" aria-hidden="true">
                      {step.number}
                    </span>
                    <span className="min-w-0">{shortStepLabel(step)}</span>
                  </a>
                </li>
              ))}
              <li className="border-ink-950/15 sm:col-span-2 lg:col-span-1 lg:border-l">
                <a
                  className="hover:bg-acid-200 flex min-h-12 items-center px-3 py-3 font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
                  href="#us-resources"
                >
                  U.S. resources
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <section className="py-12 sm:py-14 lg:py-16" aria-labelledby="rights-path-heading">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <header className="border-ink-950 grid gap-4 border-b-2 pb-6 lg:grid-cols-[13fr_7fr] lg:items-end lg:gap-12">
              <div className="grid gap-3">
                <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
                  Before you act
                </p>
                <h2
                  id="rights-path-heading"
                  className="max-w-[35ch] font-serif text-4xl font-semibold tracking-tight text-balance"
                >
                  Four steps for finding your next step
                </h2>
              </div>
              <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
                This page does not collect your location or details. Use the checklist privately,
                then verify what applies with a current local source.
              </p>
            </header>

            <div>
              {guide.steps.map((step, index) => (
                <RightsStep key={step.id} step={step} isLast={index === guide.steps.length - 1} />
              ))}
            </div>
          </div>
        </section>

        <section
          className="border-ink-950 bg-paper-100 border-y-2 py-12 sm:py-14 lg:py-16"
          id="us-resources"
          aria-labelledby="us-resources-heading"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <header className="grid gap-4 lg:grid-cols-[13fr_7fr] lg:items-end lg:gap-12">
              <div className="grid gap-3">
                <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
                  Reviewed starting points
                </p>
                <h2
                  id="us-resources-heading"
                  className="max-w-[35ch] font-serif text-4xl font-semibold tracking-tight text-balance"
                >
                  United States resources
                </h2>
              </div>
              <div className="grid gap-2">
                <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
                  These links cover U.S. agencies and federally funded help. They do not replace
                  state, territorial, tribal, or local rules.
                </p>
                <p className="font-mono text-base font-medium sm:text-sm">
                  Last reviewed <time datetime={guide.review.isoDate}>{guide.review.label}</time>
                </p>
              </div>
            </header>

            <ul className="border-ink-950 mt-7 grid border-[1.5px] sm:grid-cols-2" role="list">
              {guide.resources.map((resource, index) => (
                <ResourceCard key={resource.href} resource={resource} index={index} />
              ))}
            </ul>
          </div>
        </section>

        <section
          className="bg-ink-950 text-paper-50 py-12 sm:py-14"
          aria-labelledby="guide-boundary"
        >
          <div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 lg:grid-cols-[13fr_7fr] lg:items-start lg:gap-12 lg:px-12">
            <h2
              id="guide-boundary"
              className="max-w-[35ch] font-serif text-4xl font-semibold tracking-tight text-balance"
            >
              {guide.disclaimer.title}
            </h2>
            <p className="text-paper-100 max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
              {guide.disclaimer.body}
            </p>
          </div>
        </section>
      </main>
    )
  }
}

function RightsStep(handle: Handle<{ isLast: boolean; step: RightsGuideStep }>) {
  return () => {
    let { isLast, step } = handle.props

    return (
      <section
        id={step.id}
        className={`grid gap-5 py-8 sm:py-10 lg:grid-cols-[7fr_13fr] lg:gap-12 ${isLast ? "" : "border-ink-950/15 border-b"}`}
      >
        <h3 className="flex min-w-0 items-start gap-4">
          <span
            className="font-mono text-base font-medium tabular-nums sm:text-sm"
            aria-hidden="true"
          >
            {step.number}
          </span>
          <span className="max-w-[40ch] font-serif text-3xl font-semibold tracking-tight text-balance">
            {step.title}
          </span>
        </h3>
        <div className="text-ink-700 grid gap-5">
          <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">{step.summary}</p>
          <ul className="grid max-w-[64ch] gap-3" role="list">
            {step.items.map((item) => (
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
          {step.link ? (
            <p className="text-base/7 sm:text-sm/6">
              <a
                className="text-ink-950 font-semibold underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                href={step.link.href}
              >
                {step.link.label} <span aria-hidden="true">→</span>
              </a>
            </p>
          ) : null}
        </div>
      </section>
    )
  }
}

function ResourceCard(handle: Handle<{ index: number; resource: RightsResource }>) {
  return () => {
    let { index, resource } = handle.props
    let borderClasses = [
      "border-ink-950/15",
      index > 0 ? "border-t" : "",
      index === 1 ? "sm:border-t-0" : "",
      index % 2 === 1 ? "sm:border-l" : "",
    ]
      .filter(Boolean)
      .join(" ")

    return (
      <li className={`${borderClasses} grid content-between gap-6 p-5 sm:p-6`}>
        <div className="grid gap-3">
          <p className="font-mono text-base font-medium tracking-wide uppercase sm:text-sm">
            {resource.organization}
          </p>
          <h3 className="max-w-[40ch] font-serif text-2xl font-semibold tracking-tight text-balance">
            <a
              className="underline-offset-4 hover:underline hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              href={resource.href}
            >
              {resource.title} <span aria-hidden="true">↗</span>
            </a>
          </h3>
          <p className="text-ink-700 max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
            {resource.purpose}
          </p>
        </div>
        <dl className="border-ink-950/15 grid gap-3 border-t pt-4 text-base/7 sm:text-sm/6">
          <div className="flex min-w-0 items-baseline justify-between gap-4">
            <dt className="text-ink-950 font-medium">Scope</dt>
            <dd className="text-ink-700 min-w-0 text-right">{resource.scope}</dd>
          </div>
          <div className="flex min-w-0 items-baseline justify-between gap-4">
            <dt className="text-ink-950 font-medium">Website</dt>
            <dd className="text-ink-700 min-w-0 text-right">{resource.displayDomain}</dd>
          </div>
        </dl>
      </li>
    )
  }
}

function shortStepLabel(step: RightsGuideStep): string {
  switch (step.id) {
    case "local-rules":
      return "Local rules"
    case "clear-record":
      return "Your record"
    case "qualified-help":
      return "Qualified help"
    case "guide-limits":
      return "Guide limits"
    default:
      return step.title
  }
}
