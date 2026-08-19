import type { Handle, RemixNode } from "remix/ui"

import { ShellPage } from "./shell.tsx"

export interface AuthPageProps {
  children: RemixNode
  description: string
  eyebrow: string
  footer: RemixNode
  heading: string
  title: string
}

export function AuthPage(handle: Handle<AuthPageProps>) {
  return () => (
    <ShellPage title={handle.props.title}>
      <main className="flex min-h-[calc(100vh-4.375rem)] items-center bg-blue-200 px-4 py-10 min-[541px]:px-8 min-[541px]:py-14 min-[901px]:min-h-[calc(100vh-5.125rem)]">
        <section className="border-ink-950 shadow-ink-950 bg-paper-50 mx-auto grid w-full max-w-240 overflow-hidden border-2 shadow-[7px_7px_0_var(--color-ink-950)] min-[768px]:grid-cols-[minmax(15rem,.72fr)_minmax(22rem,1.28fr)] min-[901px]:shadow-[10px_10px_0_var(--color-ink-950)]">
          <div className="border-ink-950 bg-coral-400 flex flex-col justify-between border-b-2 p-6 min-[768px]:min-h-145 min-[768px]:border-r-2 min-[768px]:border-b-0 min-[901px]:p-9">
            <div>
              <p className="font-mono text-[10px] font-medium tracking-[1.1px] uppercase">
                {handle.props.eyebrow}
              </p>
              <h1 className="mt-5 font-serif text-5xl leading-[.9] font-extrabold tracking-[-2.5px] min-[901px]:text-6xl">
                {handle.props.heading}
              </h1>
              <p className="mt-6 max-w-80 text-sm leading-relaxed min-[901px]:text-base">
                {handle.props.description}
              </p>
            </div>
            <p className="border-ink-950 mt-10 border-t pt-4 font-mono text-[9px] leading-relaxed tracking-[.4px] uppercase">
              Keep your receipts. Share what happened. Help the next renter know.
            </p>
          </div>

          <div className="flex flex-col justify-center p-6 min-[541px]:p-9 min-[901px]:p-12">
            {handle.props.children}
            <div className="border-ink-300 mt-7 border-t pt-5 text-sm">{handle.props.footer}</div>
          </div>
        </section>
      </main>
    </ShellPage>
  )
}

export interface AuthFieldProps {
  autoComplete: string
  errors?: ReadonlyArray<string>
  label: string
  name: string
  type: "email" | "password" | "text"
  value?: string
}

export function AuthField(handle: Handle<AuthFieldProps>) {
  return () => {
    let { autoComplete, errors = [], label, name, type, value } = handle.props
    let errorId = `${name}-error`

    return (
      <div>
        <label className="mb-2 block text-sm font-bold" htmlFor={name}>
          {label}
        </label>
        {type === "password" ? (
          <input
            id={name}
            className="border-ink-950 bg-paper-50 focus:bg-acid-50 focus:ring-ink-950 aria-[invalid=true]:border-coral-600 aria-[invalid=true]:bg-coral-50 block h-12 w-full border-[1.5px] px-3 text-base outline-none focus:ring-2 focus:ring-offset-2"
            name={name}
            type="password"
            autoComplete={autoComplete}
            aria-invalid={errors.length > 0 ? "true" : undefined}
            aria-describedby={errors.length > 0 ? errorId : undefined}
            required
          />
        ) : (
          <input
            id={name}
            className="border-ink-950 bg-paper-50 focus:bg-acid-50 focus:ring-ink-950 aria-[invalid=true]:border-coral-600 aria-[invalid=true]:bg-coral-50 block h-12 w-full border-[1.5px] px-3 text-base outline-none focus:ring-2 focus:ring-offset-2"
            name={name}
            type={type}
            role="textbox"
            autoComplete={autoComplete}
            value={value}
            aria-invalid={errors.length > 0 ? "true" : undefined}
            aria-describedby={errors.length > 0 ? errorId : undefined}
            required
          />
        )}
        {errors.length > 0 ? (
          <ul id={errorId} className="text-coral-700 mt-2 space-y-1 text-sm font-semibold">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
      </div>
    )
  }
}
