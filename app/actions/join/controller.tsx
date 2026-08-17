import { completeAuth } from "remix/auth"
import * as s from "remix/data-schema"
import { email, maxLength, minLength } from "remix/data-schema/checks"
import * as f from "remix/data-schema/form-data"
import { DataTableDatabaseError } from "remix/data-table"
import { getCsrfToken } from "remix/middleware/csrf"
import { redirect } from "remix/response/redirect"
import { createController } from "remix/router"
import type { Handle, RemixNode } from "remix/ui"

import { hashPassword } from "../../bcrypt.ts"
import { users } from "../../data/schema.ts"
import {
  getLoginRedirectURL,
  getPostAuthRedirect,
  normalizeEmail,
  requireGuest,
} from "../../middleware/auth.ts"
import { routes } from "../../routes.ts"
import { AuthField, AuthPage } from "../../ui/auth-form.tsx"

const joinSchema = f.object({
  username: f.field(
    s
      .string()
      .transform((value) => value.trim())
      .pipe(minLength(3), maxLength(20)),
  ),
  email: f.field(s.string().transform(normalizeEmail).pipe(minLength(1), maxLength(254), email())),
  password: f.field(s.string().pipe(minLength(8), maxLength(128))),
  confirm_password: f.field(s.string().pipe(minLength(8), maxLength(128))),
})

export const join = createController(routes.join, {
  middleware: [requireGuest()],
  actions: {
    async action(context) {
      let csrfToken = getCsrfToken(context)
      let parsed = s.parseSafe(joinSchema, context.formData)
      let values = {
        username: (context.formData.get("username")?.toString() ?? "").trim().slice(0, 20),
        email: normalizeEmail(context.formData.get("email")?.toString() ?? "").slice(0, 254),
      }

      if (!parsed.success) {
        return renderJoin(context, csrfToken, { ...values, issues: parsed.issues }, { status: 422 })
      }

      if (parsed.value.password !== parsed.value.confirm_password) {
        return renderJoin(
          context,
          csrfToken,
          {
            ...values,
            issues: [s.createIssue("Passwords do not match", ["confirm_password"])],
          },
          { status: 422 },
        )
      }

      let user
      try {
        user = await context.db.create(
          users,
          {
            email: parsed.value.email,
            username: parsed.value.username,
            password: await hashPassword(parsed.value.password),
          },
          { returnRow: true },
        )
      } catch (error) {
        let duplicateField = getDuplicateUserField(error)
        if (duplicateField == null) throw error

        return renderJoin(
          context,
          csrfToken,
          {
            ...values,
            issues: [
              s.createIssue(`An account with this ${duplicateField} already exists.`, [
                duplicateField,
              ]),
            ],
          },
          { status: 422 },
        )
      }

      let session = completeAuth(context)
      session.set("auth", { userId: user.id })

      return redirect(getPostAuthRedirect(context.url, routes.home.href()), 303)
    },

    index(context) {
      return renderJoin(context, getCsrfToken(context))
    },
  },
})

interface JoinPageProps {
  action: string
  alternateHref: string
  csrfToken: string
  email?: string
  issues?: ReadonlyArray<s.Issue>
  username?: string
}

interface JoinRenderContext {
  render(node: RemixNode, init?: ResponseInit): Response | Promise<Response>
  url: URL
}

function JoinPage(handle: Handle<JoinPageProps>) {
  return () => {
    let usernameErrors = getIssueMessages(handle.props.issues, "username")
    let emailErrors = getIssueMessages(handle.props.issues, "email")
    let passwordErrors = getIssueMessages(handle.props.issues, "password")
    let confirmationErrors = getIssueMessages(handle.props.issues, "confirm_password")

    return (
      <AuthPage
        title="Create your wtf.rent account"
        eyebrow="Add your voice"
        heading="Create your account."
        description="Keep your rental history in one place and help other renters make informed choices."
        footer={
          <p>
            Already have an account?{" "}
            <a
              className="font-bold underline decoration-2 underline-offset-4"
              href={handle.props.alternateHref}
            >
              Sign in
            </a>
          </p>
        }
      >
        <form className="space-y-5" method="post" action={handle.props.action} rmx-document>
          <input type="hidden" name="_csrf" value={handle.props.csrfToken} />
          <AuthField
            name="username"
            type="text"
            label="Username"
            autoComplete="username"
            value={handle.props.username}
            errors={usernameErrors}
          />
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
            autoComplete="new-password"
            errors={passwordErrors}
          />
          <AuthField
            name="confirm_password"
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            errors={confirmationErrors}
          />

          <button
            className="bg-acid-100 border-ink-950 shadow-ink-950 hover:bg-acid-200 focus:ring-ink-950 mt-2 w-full border-[1.5px] px-4 py-3 text-sm font-extrabold shadow-[3px_3px_0_var(--color-ink-950)] focus:ring-2 focus:ring-offset-2 focus:outline-none"
            type="submit"
          >
            Create account
          </button>
        </form>
      </AuthPage>
    )
  }
}

function getDuplicateUserField(error: unknown): "email" | "username" | null {
  let databaseError = error instanceof DataTableDatabaseError ? error.cause : error

  if (
    typeof databaseError !== "object" ||
    databaseError == null ||
    !("code" in databaseError) ||
    !("constraint" in databaseError)
  ) {
    return null
  }

  if (databaseError.code !== "23505") return null
  if (databaseError.constraint === "User_email_key") return "email"
  if (databaseError.constraint === "User_username_key") return "username"

  return null
}

function getIssueMessages(issues: ReadonlyArray<s.Issue> | undefined, fieldName: string): string[] {
  return (
    issues?.filter((issue) => issue.path?.[0] === fieldName).map((issue) => issue.message) ?? []
  )
}

function renderJoin(
  context: JoinRenderContext,
  csrfToken: string,
  props: Pick<JoinPageProps, "email" | "issues" | "username"> = {},
  init?: ResponseInit,
) {
  return context.render(
    <JoinPage
      {...props}
      action={getLoginRedirectURL(context.url, routes.join.action)}
      alternateHref={getLoginRedirectURL(context.url, routes.login.index)}
      csrfToken={csrfToken}
    />,
    init,
  )
}
