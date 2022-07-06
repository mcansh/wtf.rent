import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLocation,
  useTransition,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import { useForm, useFieldset, conform } from "@conform-to/react";
import { resolve, parse } from "@conform-to/zod";
import z from "zod";
import { verify } from "~/bcrypt.server";
import prisma from "~/db.server";
import { sessionStorage } from "~/session.server";
import clsx from "clsx";

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

interface ActionRouteData {
  values: {
    email: string;
    password: string;
    "remember-me"?: boolean | undefined;
  };
  errors: {
    email?: string;
    password?: string;
  };
}

export let action: ActionFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));

  let formData = await request.formData();
  let result = parse(formData, login);

  if (result.state !== "accepted") {
    return json(
      { values: result.value, errors: result.error },
      { status: 400 }
    );
  }

  let url = new URL(request.url);
  let returnTo = url.searchParams.get("returnTo") ?? "/";

  let user = await prisma.user.findUnique({
    where: { email: result.value.email },
  });

  if (!user) {
    return json<ActionRouteData>(
      {
        values: result.value,
        errors: { email: "Invalid email or password" },
      },
      { status: 400 }
    );
  }

  let valid = await verify(result.value.password, user.password);

  if (!valid) {
    return json<ActionRouteData>(
      {
        values: result.value,
        errors: { password: "Invalid email or password" },
      },
      { status: 400 }
    );
  }

  session.set("userId", user.id);

  return redirect(returnTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        // if remember me is checked, set a cookie that expires in 7 days
        maxAge: result.value["remember-me"] ? 60 * 60 * 24 * 7 : undefined,
      }),
    },
  });
};

export let loader: LoaderFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");
  if (userId) return redirect("/");
  return {};
};

export let meta: MetaFunction = () => ({
  title: "Log in",
});

export default function LoginPage() {
  let location = useLocation();
  let transition = useTransition();
  let pendingForm = transition.submission;

  let actionData = useActionData<ActionRouteData>();
  let formProps = useForm();
  let [fieldsetProps, result] = useFieldset(schema, {
    error: actionData?.errors,
    initialValue: actionData?.values,
  });

  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to WTF.rent
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          <Form
            method="post"
            action={location.pathname + location.search}
            {...formProps}
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
                  <div
                    id="password-error"
                    className="mt-2 text-sm text-red-600"
                  >
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
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a
                    href="#"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Forgot your password?
                  </a>
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
        </div>
      </div>
    </div>
  );
}
