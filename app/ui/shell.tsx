import { getContext } from "remix/middleware/async-context"
import { getCsrfToken } from "remix/middleware/csrf"
import type { Handle, RemixNode } from "remix/ui"

import { Brand } from "../public/brand.tsx"
import { routes } from "../routes.ts"
import { getCurrentUserSafely } from "../utils/context.ts"
import type { DocumentProps } from "./document.tsx"
import { Document } from "./document.tsx"

const NAV_ITEMS = [
  ["Feed", routes.home.href()],
  ["Directory", routes.directory.href()],
  ["Rights", routes.rights.href()],
  ["About", routes.about.href()],
]

export { DocumentWithShell as ShellPage }

function Shell(handle: Handle<{ children: RemixNode }>) {
  let context = getContext()
  let user = getCurrentUserSafely()
  let csrfToken = user ? getCsrfToken(context) : null

  return () => (
    <div className="bg-paper-50 text-ink-950 flex min-h-screen flex-col">
      <header className="border-line-950 flex h-17.5 items-center justify-between gap-3 border-b-2 px-4 min-[541px]:px-5 min-[901px]:h-20.5 min-[901px]:px-[5.2vw]">
        <a href={routes.home.href()} aria-label="wtf.rent home">
          <Brand />
        </a>
        <nav
          aria-label="Primary"
          className="flex items-center gap-3 text-[11px] font-bold min-[541px]:gap-5 min-[541px]:text-sm min-[901px]:gap-7"
        >
          <div className="hidden items-center gap-5 min-[541px]:flex min-[901px]:gap-7">
            {NAV_ITEMS.map(([label, path], index) => {
              let isActive = context.url.pathname === path
              return (
                <a
                  key={path}
                  href={path}
                  aria-current={isActive ? "page" : undefined}
                  className={`${index === 0 ? "" : "hidden min-[901px]:inline"} decoration-2 underline-offset-4 hover:underline aria-[current=page]:underline`}
                >
                  {label}
                </a>
              )
            })}
          </div>

          {user && csrfToken ? (
            <div className="flex items-center gap-3 min-[541px]:gap-4">
              <a
                href={routes.profile.href()}
                aria-current={context.url.pathname === routes.profile.href() ? "page" : undefined}
                className="decoration-2 underline-offset-4 hover:underline aria-[current=page]:underline"
              >
                Profile
              </a>
              <form method="post" action={routes.logout.href()} rmx-document>
                <input type="hidden" name="_csrf" value={csrfToken} />
                <button
                  className="border-ink-950 bg-coral-400 hover:bg-coral-300 focus:ring-ink-950 border-[1.5px] px-2.5 py-1.5 font-bold focus:ring-2 focus:ring-offset-2 focus:outline-none min-[541px]:px-3"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-3 min-[541px]:gap-4">
              <a
                href={routes.join.index.href()}
                className="border-ink-950 bg-acid-100 hover:bg-acid-200 focus:ring-ink-950 border-[1.5px] px-2.5 py-1.5 focus:ring-2 focus:ring-offset-2 focus:outline-none min-[541px]:px-3"
              >
                Join
              </a>
              <a
                href={routes.login.index.href()}
                className="decoration-2 underline-offset-4 hover:underline"
              >
                Sign in
              </a>
            </div>
          )}
        </nav>
      </header>
      <div className="flex-auto">{handle.props.children}</div>
      <footer className="bg-ink-950 text-paper-50 flex flex-col gap-5 px-5 py-7 min-[541px]:flex-row min-[541px]:items-center min-[541px]:justify-between min-[901px]:px-[8vw]">
        <div>
          <Brand footer />
          <p className="my-5 max-w-87.5 text-xs min-[901px]:my-0">
            Built by renters, for renters. Share responsibly and stick to what you know.
          </p>
          <a className="text-acid-100 text-sm font-bold" href="/about">
            About wtf.rent →
          </a>
        </div>
        <div className="text-sm font-bold">
          Renting is local. Knowing your rights should be too.
        </div>
        <a
          href={routes.home.href()}
          className="text-acid-100 flex items-center gap-1 text-sm font-bold"
        >
          Back to the feed{" "}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
            />
          </svg>
        </a>
      </footer>
    </div>
  )
}

export function DocumentWithShell(handle: Handle<DocumentProps>) {
  return () => (
    <Document {...handle.props}>
      <Shell>{handle.props.children}</Shell>
    </Document>
  )
}
