import clsx from "clsx";
import {
  data,
  Form,
  Link,
  redirect,
  useLocation,
  useNavigation,
} from "react-router";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { db } from "~/.server/db";
import { verify } from "~/bcrypt.server";
import { createUserSession, getUserId } from "~/session.server";
import type { AuthRouteHandle } from "~/utils";
import { safeRedirect } from "~/utils";
import type { Route } from "./+types/_auth.login";

let login = zfd.formData({
  email: zfd.text(
    z
      .string({ required_error: "Email is required" })
      .email("Your email address is invalid"),
  ),
  password: zfd.text(
    z.string({ required_error: "Password is required" }).min(8, "The minimum password length is 8 characters"),
  ),
  "remember-me": zfd.checkbox(),
});

export async function action({ request }: Route.ActionArgs) {
  let formData = await request.formData();
  let result = login.safeParse(formData);

  if (!result.success) {
    return data(
      { values: {}, errors: result.error.formErrors.fieldErrors },
      { status: 400 },
    );
  }

  let url = new URL(request.url);
  let redirectTo = safeRedirect(url.searchParams.get("returnTo"));

  let user = await db.user.findUnique({
    where: { email: result.data.email },
  });

  if (!user) {
    return data(
      {
        values: result.data,
        errors: { email: "Invalid email or password", password: null },
      },
      { status: 422 },
    );
  }

  let valid = await verify(result.data.password, user.password);

  if (!valid) {
    return data(
      {
        values: result.data,
        errors: { email: null, password: "Invalid email or password" },
      },
      { status: 422 },
    );
  }

  return createUserSession({
    userId: user.id,
    redirectTo,
    remember: result.data["remember-me"],
    request,
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  let userId = await getUserId(request);
  if (userId) return redirect("/");
  return {};
}

export function meta(): Route.MetaDescriptors {
  return [{ title: "Sign in to WTF.rent" }];
}

export let handle: AuthRouteHandle = {
  title: "Sign in to WTF.rent",
};

export default function LoginPage({ actionData }: Route.ComponentProps) {
  let location = useLocation();
  let navigation = useNavigation();
  let pendingForm = navigation.state === "submitting";

  return (
    <>
      <Form
        method="post"
        action={location.pathname + location.search}
        className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10"
      >
        <fieldset className="space-y-6" disabled={!!pendingForm}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <div className="mt-1">
              <input
                id="email"
                autoComplete="email"
                name="email"
                type="email"
                className={clsx(
                  "block w-full appearance-none rounded-md border px-3 py-2 shadow-sm focus:outline-none sm:text-sm",
                  actionData?.errors.email
                    ? "border-red-300 placeholder-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500",
                )}
                aria-invalid={Boolean(actionData?.errors.email)}
                aria-describedby={
                  actionData?.errors.email ? "email-error" : undefined
                }
              />
            </div>
            {actionData?.errors.email && (
              <div id="email-error" className="mt-2 text-sm text-red-600">
                {actionData.errors.email}
              </div>
            )}
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
                className={clsx(
                  "block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none sm:text-sm",
                  actionData?.errors.password
                    ? "border-red-300 placeholder-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500",
                )}
                name="password"
                type="password"
                aria-invalid={Boolean(actionData?.errors.password)}
                aria-describedby={
                  actionData?.errors.password ? "password-error" : undefined
                }
              />
            </div>
            {actionData?.errors.password && (
              <div id="password-error" className="mt-2 text-sm text-red-600">
                {actionData.errors.password}
              </div>
            )}
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

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            >
              Sign in
            </button>
          </div>
        </fieldset>
      </Form>
      <div className="mt-4 text-center font-medium text-indigo-600 hover:text-indigo-500">
        <Link to="/join">New Here? Join now.</Link>
      </div>
    </>
  );
}
