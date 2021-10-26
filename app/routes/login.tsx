import {
  ActionFunction,
  Form,
  LoaderFunction,
  MetaFunction,
  redirect,
  RouteComponent,
  useTransition,
} from "remix";
import { json } from "remix-utils";
import { verify } from "~/bcrypt.server";
import prisma from "~/db.server";
import { sessionStorage } from "~/session.server";

let action: ActionFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let requestBody = await request.text();
  let formData = new URLSearchParams(requestBody);

  let username = formData.get("username");
  let password = formData.get("password");
  let rememberMe = formData.get("remember-me") === "on";

  if (!username) {
    return json(
      { field: "username", message: "Username is required" },
      { status: 400 }
    );
  }

  if (!password) {
    return json(
      { field: "password", message: "Password is required" },
      { status: 400 }
    );
  }

  let user = await prisma.user.findUnique({
    where: { username: username },
  });

  if (!user) {
    return json({ message: "Invalid username or password" }, { status: 400 });
  }

  let valid = await verify(password, user.password);

  if (!valid) {
    return json({ message: "Invalid username or password" }, { status: 400 });
  }

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

let loader: LoaderFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");
  if (userId) return redirect("/");
  return {};
};

let meta: MetaFunction = () => ({
  title: "Log in",
});

const LoginPage: RouteComponent = () => {
  let transition = useTransition();
  let pendingForm = transition.submission;

  return (
    <div className="flex flex-col justify-center min-h-full py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900">
          Sign in to WTF.rent
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="px-4 py-8 bg-white shadow sm:rounded-lg sm:px-10">
          <Form method="post">
            <fieldset className="space-y-6" disabled={!!pendingForm}>
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
                    className="block w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                    className="block w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="remember-me"
                    className="block ml-2 text-sm text-gray-900"
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
                  className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
};

export default LoginPage;
export { action, loader, meta };
