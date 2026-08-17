import { createAction } from "remix/router"
import type { RemixNode } from "remix/ui"

import { Brand } from "../public/brand.tsx"
import { routes } from "../routes.ts"
import { Document } from "../ui/document.tsx"

export const notFoundHandler = createAction("*", (context) => notFound(context.render))

export function notFound(render: (node: RemixNode, init?: ResponseInit) => Response) {
  return render(
    <Document title="404 Not Found | wtf.rent">
      <NotFoundPage />
    </Document>,
    { status: 404 },
  )
}

function NotFoundPage() {
  return () => (
    <main className="text-ink-950 isolate min-h-svh overflow-hidden bg-blue-200 antialiased">
      <div className="mx-auto flex min-h-svh max-w-[90rem] flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
        <header className="border-ink-950 flex items-start justify-between gap-6 border-b-2 pb-5">
          <a
            href={routes.home.href()}
            aria-label="wtf.rent home"
            className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            <Brand />
          </a>
          <p className="font-mono text-base tracking-wide sm:text-sm">ERROR / 404</p>
        </header>

        <section className="grid flex-auto items-center gap-10 py-10 lg:grid-cols-[12fr_8fr] lg:gap-16 lg:py-16">
          <div className="flex flex-col items-start gap-6">
            <p className="font-mono text-base tracking-wide sm:text-sm">LISTING STATUS: MISSING</p>
            <h1 className="max-w-[20ch] font-serif text-6xl font-semibold tracking-tight text-balance sm:text-7xl lg:text-8xl">
              This address is off the market.
            </h1>
            <p className="max-w-[48ch] text-lg text-pretty sm:text-base">
              No page lives here. It may have moved, expired, or never signed a lease.
            </p>
            <a
              className="bg-acid-100 hover:bg-acid-50 inline-flex items-center gap-2 py-3 pr-3 pl-4 font-semibold shadow-[4px_4px_0_var(--color-ink-950)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              href={routes.home.href()}
            >
              Browse real reports <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="relative min-h-72 sm:min-h-96" aria-hidden="true">
            <p className="text-paper-50 absolute inset-0 grid place-items-center font-serif text-[12rem] font-semibold tracking-tight tabular-nums sm:text-[18rem] lg:text-[21rem]">
              404
            </p>
            <div className="border-ink-950 bg-acid-100 absolute top-1/2 left-1/2 w-52 -translate-1/2 -rotate-3 border-2 p-5 sm:w-60">
              <p className="font-mono text-base tracking-wide sm:text-sm">PUBLIC NOTICE</p>
              <p className="mt-8 font-serif text-4xl font-semibold tracking-tight">VACANT</p>
              <p className="mt-2 text-base">No record found at this location.</p>
            </div>
          </div>
        </section>

        <p className="border-ink-950 border-t-2 pt-5 text-base sm:text-sm">
          Checked every unit. Nothing here.
        </p>
      </div>
    </main>
  )
}
