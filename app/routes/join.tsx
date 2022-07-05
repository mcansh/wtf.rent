import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useTransition } from "@remix-run/react";
import { sessionStorage } from "~/session.server";
import { hash } from "~/bcrypt.server";
import prisma from "~/db.server";
import type { RouteHandle } from "~/use-matches";

interface ActionData {
  error: string;
  field: "email" | "password" | "passwordConfirm" | "username";
}

export let action: ActionFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let formData = await request.formData();

  let email = formData.get("email");
  let username = formData.get("username");
  let password = formData.get("password");
  let passwordConfirm = formData.get("passwordConfirm");
  let rememberMe = formData.get("remember-me") === "on";

  if (typeof email !== "string" || !email.length) {
    return json<ActionData>(
      { field: "email", error: "Email is required" },
      { status: 400 }
    );
  }

  if (typeof username !== "string" || !username.length) {
    return json<ActionData>(
      { field: "username", error: "Username is required" },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || !password.length) {
    return json<ActionData>(
      { field: "password", error: "Password is required" },
      { status: 400 }
    );
  }

  if (typeof passwordConfirm !== "string" || !passwordConfirm.length) {
    return json<ActionData>(
      { field: "passwordConfirm", error: "Password confirmation is required" },
      { status: 400 }
    );
  }

  if (password !== passwordConfirm) {
    return json<ActionData>(
      { field: "passwordConfirm", error: "Passwords do not match" },
      { status: 400 }
    );
  }

  let user = await prisma.user.create({
    data: {
      email,
      password: await hash(password),
      username,
    },
  });

  session.set("userId", user.id);

  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        // if remember me is checked, set a cookie that expires in 7 days
        maxAge: rememberMe ? 60 * 60 * 24 * 7 * 1000 : undefined,
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
  title: "Join",
});

export let handle: RouteHandle = {
  bodyClassName: "bg-gray-50",
};

export default function JoinPage() {
  let action = useActionData<ActionData>();
  let transition = useTransition();
  let pendingForm = transition.submission;

  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Join WTF.rent
        </h2>
      </div>

      {action && (
        <pre>
          <code>{JSON.stringify(action, null, 2)}</code>
        </pre>
      )}

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          <Form method="post">
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
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
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
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
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
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
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
                    name="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
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
                  Join
                </button>
              </div>
            </fieldset>
          </Form>
        </div>
      </div>
    </div>
  );
}
