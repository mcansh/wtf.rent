import { completeAuth, verifyCredentials } from "remix/auth"
import * as s from "remix/data-schema"
import { email, maxLength, minLength } from "remix/data-schema/checks"
import * as f from "remix/data-schema/form-data"
import { getCsrfToken } from "remix/middleware/csrf"
import { redirect } from "remix/response/redirect"
import { createController } from "remix/router"
import type { Handle, RemixNode } from "remix/ui"

import {
  getLoginRedirectURL,
  getLoginThrottleKey,
  getPostAuthRedirect,
  normalizeEmail,
  passwordProvider,
  requireGuest,
} from "../../middleware/auth.ts"
import { routes } from "../../routes.ts"
import { AuthField, AuthPage } from "../../ui/auth-form.tsx"

const loginSchema = f.object({
  email: f.field(s.string().transform(normalizeEmail).pipe(minLength(1), maxLength(254), email())),
  password: f.field(s.string().pipe(minLength(8), maxLength(128))),
})

const invalidCredentialsMessage = "Invalid email or password."

export const login = createController(routes.login, {
  middleware: [requireGuest()],
  actions: {
    async action(context) {
      let csrfToken = getCsrfToken(context)
      let parsed = s.parseSafe(loginSchema, context.formData)
      let emailValue = normalizeEmail(context.formData.get("email")?.toString() ?? "").slice(0, 254)

      if (!parsed.success) {
        return renderLogin(
          context,
          csrfToken,
          { email: emailValue, issues: parsed.issues },
          { status: 422 },
        )
      }

      let throttleKey = getLoginThrottleKey(context.request, parsed.value.email)
      let throttleStatus = context.loginThrottle.check(throttleKey)
      if (!throttleStatus.allowed) {
        return renderLogin(
          context,
          csrfToken,
          {
            email: parsed.value.email,
            error: `Too many sign-in attempts. Try again in ${throttleStatus.retryAfter} seconds.`,
          },
          {
            status: 429,
            headers: { "Retry-After": String(throttleStatus.retryAfter) },
          },
        )
      }

      let user = await verifyCredentials(passwordProvider, context)
      if (user == null) {
        context.loginThrottle.recordFailure(throttleKey)
        return renderLogin(
          context,
          csrfToken,
          { email: parsed.value.email, error: invalidCredentialsMessage },
          { status: 422 },
        )
      }

      context.loginThrottle.reset(throttleKey)
      let session = completeAuth(context)
      session.set("auth", { userId: user.id })

      return redirect(getPostAuthRedirect(context.url), 303)
    },

    index(context) {
      return renderLogin(context, getCsrfToken(context))
    },
  },
})

interface LoginPageProps {
  action: string
  alternateHref: string
  csrfToken: string
  email?: string
  error?: string
  issues?: ReadonlyArray<s.Issue>
}

interface LoginRenderContext {
  render(node: RemixNode, init?: ResponseInit): Response | Promise<Response>
  url: URL
}

function LoginPage(handle: Handle<LoginPageProps>) {
  return () => {
    let emailErrors = getIssueMessages(handle.props.issues, "email")
    let passwordErrors = getIssueMessages(handle.props.issues, "password")

    return (
      <AuthPage
        title="Sign in to wtf.rent"
        eyebrow="Welcome back"
        heading="Sign in to the record."
        description="Pick up where you left off and keep your rental history attached to one account."
        footer={
          <p>
            New here?{" "}
            <a
              className="font-bold underline decoration-2 underline-offset-4"
              href={handle.props.alternateHref}
            >
              Create an account
            </a>
          </p>
        }
      >
        <form className="space-y-5" method="post" action={handle.props.action} rmx-document>
          <input type="hidden" name="_csrf" value={handle.props.csrfToken} />
          {handle.props.error ? (
            <div
              className="border-coral-700 bg-coral-50 border-l-4 px-4 py-3 text-sm font-semibold"
              role="alert"
            >
              {handle.props.error}
            </div>
          ) : null}

          <AuthField
            name="email"
            type="email"
            label="Email address"
            autoComplete="email"
            value={handle.props.email}
            errors={emailErrors}
          />
          <AuthField
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            errors={passwordErrors}
          />

          <button
            className="bg-acid-100 border-ink-950 shadow-ink-950 hover:bg-acid-200 focus:ring-ink-950 mt-2 w-full border-[1.5px] px-4 py-3 text-sm font-extrabold shadow-[3px_3px_0_var(--color-ink-950)] focus:ring-2 focus:ring-offset-2 focus:outline-none"
            type="submit"
          >
            Sign in
          </button>
        </form>
      </AuthPage>
    )
  }
}

function getIssueMessages(issues: ReadonlyArray<s.Issue> | undefined, fieldName: string): string[] {
  return (
    issues?.filter((issue) => issue.path?.[0] === fieldName).map((issue) => issue.message) ?? []
  )
}

function renderLogin(
  context: LoginRenderContext,
  csrfToken: string,
  props: Pick<LoginPageProps, "email" | "error" | "issues"> = {},
  init?: ResponseInit,
) {
  return context.render(
    <LoginPage
      {...props}
      action={getLoginRedirectURL(context.url, routes.login.action)}
      alternateHref={getLoginRedirectURL(context.url, routes.join.index)}
      csrfToken={csrfToken}
    />,
    init,
  )
}
