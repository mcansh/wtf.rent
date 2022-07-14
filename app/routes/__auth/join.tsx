import type { ActionArgs, LoaderArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useTransition } from "@remix-run/react";
import { useForm, useFieldset, conform } from "@conform-to/react";
import { resolve, parse } from "@conform-to/zod";
import z from "zod";
import { createUserSession, getUserId } from "~/session.server";
import { Prisma } from "@prisma/client";
import type { AuthRouteHandle } from "~/use-matches";
import { createUser } from "~/models/user.server";

let join = z
  .object({
    email: z
      .string({ required_error: "Email is required" })
      .email("You email address is invalid"),
    username: z.string({ required_error: "Username is required" }),
    password: z
      .string({ required_error: "Password is required" })
      .min(8, "The minimum password length is 8 characters"),
    passwordConfirm: z.string({
      required_error: "Confirm password is required",
    }),
    "remember-me": z.boolean().optional(),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    message: "The password do not match",
    path: ["confirm"],
  });

let schema = resolve(join);

export async function action({ request }: ActionArgs) {
  let formData = await request.formData();
  let result = parse(formData, join);

  if (result.state !== "accepted") {
    return json(
      { values: result.value, errors: result.error },
      { status: 400 }
    );
  }

  try {
    let user = await createUser({
      email: result.value.email,
      username: result.value.username,
      password: result.value.password,
    });

    return createUserSession({
      userId: user.id,
      request,
      redirectTo: "/",
      remember: !!result.value["remember-me"],
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
              values: result.value,
              errors: Object.fromEntries(
                target.map((t) => {
                  return [t, `A user with this ${t} already exists`];
                })
              ),
            },
            { status: 400 }
          );
        }
      }
    }

    throw error;
  }
}

export async function loader({ request }: LoaderArgs) {
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
  let formProps = useForm();
  let [fieldsetProps, result] = useFieldset(schema, {
    error: { ...actionData?.errors },
    initialValue: { ...actionData?.values },
  });

  return (
    <>
      <Form
        method="post"
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
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                autoComplete="email"
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
                aria-errormessage={
                  result.username.error ? "username-error" : undefined
                }
                {...conform.input(result.username, { type: "text" })}
              />
            </div>
            {result.username.error && (
              <div id="username-error" className="mt-2 text-sm text-red-600">
                {result.username.error}
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
                aria-errormessage={
                  result.passwordConfirm.error
                    ? "passwordConfirm-error"
                    : undefined
                }
                {...conform.input(result.passwordConfirm, {
                  type: "password",
                })}
              />
            </div>
            {result.passwordConfirm.error && (
              <div
                id="passwordConfirm-error"
                className="mt-2 text-sm text-red-600"
              >
                {result.passwordConfirm.error}
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
