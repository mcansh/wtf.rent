import type { Handle } from "remix/ui"

import { DocumentWithShell } from "../../ui/shell.tsx"

export function ProfilePage(handle: Handle<{ email: string; username: string }>) {
  return () => (
    <DocumentWithShell title={`${handle.props.username} · wtf.rent`}>
      <main className="min-h-[calc(100vh-4.375rem)] bg-blue-100 px-5 py-12 min-[541px]:px-8 min-[901px]:min-h-[calc(100vh-5.125rem)] min-[901px]:px-[8vw] min-[901px]:py-18">
        <section className="border-ink-950 shadow-ink-950 bg-paper-50 mx-auto max-w-180 border-2 p-6 shadow-[7px_7px_0_var(--color-ink-950)] min-[541px]:p-9 min-[901px]:p-12">
          <p className="font-mono text-[10px] font-medium tracking-[1.1px] uppercase">
            Your account
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-none font-extrabold tracking-[-2px] min-[541px]:text-6xl">
            Profile
          </h1>
          <dl className="border-ink-950 mt-9 grid gap-6 border-t-2 pt-7 min-[541px]:grid-cols-2">
            <div>
              <dt className="font-mono text-[10px] font-bold tracking-[.8px] uppercase">
                Username
              </dt>
              <dd className="mt-2 text-lg font-bold break-words">{handle.props.username}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-bold tracking-[.8px] uppercase">Email</dt>
              <dd className="mt-2 text-lg font-bold break-words">{handle.props.email}</dd>
            </div>
          </dl>
        </section>
      </main>
    </DocumentWithShell>
  )
}
