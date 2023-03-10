import type { DataFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useTransition } from "@remix-run/react";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { Prisma } from "@prisma/client";

import { createUserSession, getUserId } from "~/session.server";
import type { AuthRouteHandle } from "~/utils";
import { safeRedirect } from "~/utils";
import { createUser } from "~/models/user.server";

let join = zfd
  .formData({
    email: zfd.text(
      z
        .string({ required_error: "Email is required" })
        .email("Your email address is invalid")
    ),
    username: zfd.text(z.string({ required_error: "Username is required" })),
    password: zfd.text(
      z
        .string({ required_error: "Password is required" })
        .min(8, "The minimum password length is 8 characters")
    ),
    passwordConfirm: zfd.text(
      z.string({
        required_error: "Confirm password is required",
      })
    ),
    "remember-me": zfd.checkbox(),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    message: "The password do not match",
    path: ["passwordConfirm"],
  });

export async function action({ request }: DataFunctionArgs) {
  let formData = await request.formData();
  let result = join.safeParse(formData);

  if (!result.success) {
    return json(
      { values: {}, errors: result.error.formErrors.fieldErrors },
      { status: 422 }
    );
  }

  try {
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // The .code property can be accessed in a type-safe manner
      if (error.code === "P2002") {
        if (error.meta?.target) {
          let target = Array.isArray(error.meta.target)
            ? error.meta.target.filter(
                (v): v is string => typeof v === "string"
              )
            : [String(error.meta.target)];

          return json(
            {
              values: result.data,
              errors: Object.fromEntries(
                target.map((t) => {
                  return [t, `A user with this ${t} already exists`];
                })
              ),
            },
            { status: 422 }
          );
        }
      }
    }

    throw error;
  }
}

export async function loader({ request }: DataFunctionArgs) {
  let userId = await getUserId(request);
  if (userId) return redirect("/");
  return {};
}

export let meta: MetaFunction = () => ({
  title: "Join WTF.rent",
});

export let handle: AuthRouteHandle = {
  title: "Join WTF.rent",
};

export default function JoinPage() {
  let transition = useTransition();
  let pendingForm = transition.submission;

  let actionData = useActionData<typeof action>();

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
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                name="email"
                type="email"
                aria-invalid={actionData?.errors.email ? "true" : undefined}
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
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <div className="mt-1">
              <input
                id="username"
                autoComplete="username"
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                name="username"
                aria-invalid={Boolean(actionData?.errors.username)}
                aria-describedby={
                  actionData?.errors.username ? "username-error" : undefined
                }
              />
            </div>
            {actionData?.errors.username && (
              <div id="username-error" className="mt-2 text-sm text-red-600">
                {actionData.errors.username}
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
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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

          <div>
            <label
              htmlFor="passwordConfirm"
              className="block text-sm font-medium text-gray-700"
            >
              Password confirmation
            </label>
            <div className="mt-1">
              <input
                id="passwordConfirm"
                autoComplete="new-password"
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                name="passwordConfirm"
                type="password"
                aria-invalid={Boolean(actionData?.errors.passwordConfirm)}
                aria-describedby={
                  actionData?.errors.passwordConfirm
                    ? "passwordConfirm-error"
                    : undefined
                }
              />
            </div>
            {actionData?.errors.passwordConfirm && (
              <div
                id="passwordConfirm-error"
                className="mt-2 text-sm text-red-600"
              >
                {actionData.errors.passwordConfirm}
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
          </div>

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
