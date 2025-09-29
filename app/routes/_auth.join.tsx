import { decode } from "decode-formdata";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import { z } from "zod";
import { safeRedirect } from "~/.server/http";
import { createUser } from "~/.server/models/user";
import { createUserSession, getUserId } from "~/.server/session";
import { hasErrors, RenderErrors } from "~/utils/errors";
import type { AuthRouteHandle } from "~/utils/use-matches";
import type { Route } from "./+types/_auth.join";

let joinSchema = z
  .object({
    email: z.email(),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(8, "The minimum password length is 8 characters"),
    "password-confirmation": z
      .string()
      .min(1, "Password confirmation is required"),
    "remember-me": z.boolean(),
  })
  .refine((data) => data.password === data["password-confirmation"], {
    message: "The passwords do not match",
    path: ["'password-confirmation'"],
  });

export async function action({ request }: Route.ActionArgs) {
  let formData = await request.formData();

  let formValues = decode(formData, {
    booleans: ["remember-me"],
  });

  let result = joinSchema.safeParse(formValues);

  if (!result.success) {
    return data(
      { values: {}, errors: z.treeifyError(result.error).properties },
      { status: 422 },
    );
  }

  let user = await createUser({
    email: result.data.email,
    username: result.data.username,
    password: result.data.password,
  });

  let redirectTo = safeRedirect(formData.get("redirectTo"));

  return createUserSession({
    userId: user.id,
    request,
    redirectTo,
    remember: result.data["remember-me"],
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  let userId = await getUserId(request);
  if (userId) return redirect("/");
  return {};
}

let title = "Join WTF.rent";

export function meta(): Route.MetaDescriptors {
  return [{ title }];
}

export const handle: AuthRouteHandle = {
  title,
};

export default function JoinPage({ actionData }: Route.ComponentProps) {
  let navigation = useNavigation();
  let pendingForm = navigation.state === "submitting";

  return (
    <>
      <Form
        method="post"
        className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10"
      >
        <fieldset className="space-y-6" disabled={!!pendingForm}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                autoComplete="email"
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                name="email"
                type="email"
                aria-invalid={
                  hasErrors(actionData?.errors, "email") ? "true" : undefined
                }
                aria-describedby={
                  actionData?.errors?.email ? "email-error" : undefined
                }
              />
            </div>
            <RenderErrors errors={actionData?.errors} field="email" />
          </div>

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <div className="mt-1">
              <input
                id="username"
                autoComplete="username"
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                name="username"
                aria-invalid={
                  hasErrors(actionData?.errors, "username") ? "true" : undefined
                }
                aria-describedby={
                  hasErrors(actionData?.errors, "username")
                    ? "username-error"
                    : undefined
                }
              />
            </div>
            <RenderErrors errors={actionData?.errors} field="username" />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                autoComplete="new-password"
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                name="password"
                type="password"
                aria-invalid={
                  hasErrors(actionData?.errors, "password") ? "true" : undefined
                }
                aria-describedby={
                  hasErrors(actionData?.errors, "password")
                    ? "password-error"
                    : undefined
                }
              />
            </div>
            <RenderErrors errors={actionData?.errors} field="password" />
          </div>

          <div>
            <label
              htmlFor="password-confirmation"
              className="block text-sm font-medium text-gray-700"
            >
              Password confirmation
            </label>
            <div className="mt-1">
              <input
                id="password-confirmation"
                autoComplete="new-password"
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                name="password-confirmation"
                type="password"
                aria-invalid={
                  hasErrors(actionData?.errors, "password-confirmation")
                    ? "true"
                    : undefined
                }
                aria-describedby={
                  hasErrors(actionData?.errors, "password-confirmation")
                    ? "password-confirmation-error"
                    : undefined
                }
              />
            </div>
            <RenderErrors
              errors={actionData?.errors}
              field="password-confirmation"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-900"
              >
                Remember me
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            >
              Join
            </button>
          </div>
        </fieldset>
      </Form>
      <div className="mt-4 text-center font-medium text-indigo-600 hover:text-indigo-500">
        <Link to="/login">Already have an account? Login here.</Link>
      </div>
    </>
  );
}
