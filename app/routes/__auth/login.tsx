import type { ActionArgs, LoaderArgs, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLocation,
  useTransition,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import { useForm, useFieldset, conform } from "@conform-to/react";
import { resolve, parse } from "@conform-to/zod";
import z from "zod";
import clsx from "clsx";

import { verify } from "~/bcrypt.server";
import { db } from "~/db.server";
import { createUserSession, getUserId } from "~/session.server";
import type { AuthRouteHandle } from "~/utils";
import { safeRedirect } from "~/utils";

let login = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("You email address is invalid"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "The minimum password length is 8 characters"),
  "remember-me": z.boolean().optional(),
});

let schema = resolve(login);

export async function action({ request }: ActionArgs) {
  let formData = await request.formData();
  let result = parse(formData, login);

  if (result.state !== "accepted") {
    return json(
      { values: result.value, errors: result.error },
      { status: 400 }
    );
  }

  let url = new URL(request.url);
  let redirectTo = safeRedirect(url.searchParams.get("returnTo"));

  let user = await db.user.findUnique({
    where: { email: result.value.email },
  });

  if (!user) {
    return json(
      {
        values: result.value,
        errors: { email: "Invalid email or password" },
      },
      { status: 400 }
    );
  }

  let valid = await verify(result.value.password, user.password);

  if (!valid) {
    return json(
      {
        values: result.value,
        errors: { password: "Invalid email or password" },
      },
      { status: 400 }
    );
  }

  return createUserSession({
    userId: user.id,
    redirectTo,
    remember: !!result.value["remember-me"],
    request,
  });
}

export async function loader({ request }: LoaderArgs) {
  let userId = await getUserId(request);
  if (userId) return redirect("/");
  return {};
}

export let meta: MetaFunction = () => ({
  title: "Sign in to WTF.rent",
});

export let handle: AuthRouteHandle = {
  title: "Sign in to WTF.rent",
};

export default function LoginPage() {
  let location = useLocation();
  let transition = useTransition();
  let pendingForm = transition.submission;

  let actionData = useActionData<typeof action>();
  let formProps = useForm();
  let [fieldsetProps, result] = useFieldset(schema, {
    error: { ...actionData?.errors },
    initialValue: { ...actionData?.values },
  });

  return (
    <>
      <Form
        method="post"
        action={location.pathname + location.search}
        {...formProps}
        className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10"
      >
        <fieldset
          className="space-y-6"
          disabled={!!pendingForm}
          {...fieldsetProps}
        >
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
                className={clsx(
                  "block w-full appearance-none rounded-md border px-3 py-2 shadow-sm focus:outline-none sm:text-sm",
                  result.email.error
                    ? "border-red-300 placeholder-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                )}
                aria-errormessage={
                  result.email.error ? "email-error" : undefined
                }
                {...conform.input(result.email, { type: "email" })}
              />
            </div>
            {result.email.error && (
              <div id="email-error" className="mt-2 text-sm text-red-600">
                {result.email.error}
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
                  "block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none  sm:text-sm",
                  result.password.error
                    ? "border-red-300 placeholder-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                )}
                aria-errormessage={
                  result.password.error ? "password-error" : undefined
                }
                {...conform.input(result.password, { type: "password" })}
              />
            </div>
            {result.password.error && (
              <div id="password-error" className="mt-2 text-sm text-red-600">
                {result.password.error}
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
                defaultChecked={result["remember-me"].initialValue === "on"}
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
              className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
