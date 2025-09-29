import { decode } from "decode-formdata";
import {
  data,
  Form,
  Link,
  redirect,
  useLocation,
  useNavigation,
} from "react-router";
import * as z from "zod";
import { verify } from "~/.server/bcrypt";
import { db } from "~/.server/db";
import { safeRedirect } from "~/.server/http";
import { createUserSession, getUserId } from "~/.server/session";
import { Input } from "~/components/input";
import type { AuthRouteHandle } from "~/utils/use-matches";
import type { Route } from "./+types/_auth.login";

let loginSchema = z.object({
  email: z.email(),
  password: z.string(),
  "remember-me": z.boolean(),
});

export async function action({ request }: Route.ActionArgs) {
  let formData = await request.formData();

  let formValues = decode(formData, {
    booleans: ["remember-me"],
  });

  let result = loginSchema.safeParse(formValues);

  if (!result.success) {
    return data(
      { values: {}, errors: z.treeifyError(result.error).properties },
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
        errors: {
          email: {
            errors: ["Invalid email or password"],
          },
        },
      },
      { status: 422 },
    );
  }

  let valid = await verify(result.data.password, user.password);

  if (!valid) {
    return data(
      {
        values: result.data,
        errors: {
          password: {
            errors: ["Invalid email or password"],
          },
        },
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
            <Input
              id="email"
              autoComplete="email"
              name="email"
              type="email"
              field="email"
              errors={actionData?.errors}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <Input
              id="password"
              field="password"
              autoComplete="new-password"
              name="password"
              type="password"
              errors={actionData?.errors}
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
