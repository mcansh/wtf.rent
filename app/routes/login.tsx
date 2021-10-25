import { ActionFunction, Form, LoaderFunction } from "remix";
import { authenticator } from "~/auth.server";

export let action: ActionFunction = async ({ request }) => {
  return authenticator.authenticate("local", request, {
    successRedirect: "/",
    failureRedirect: "/login",
  });
};

export let loader: LoaderFunction = async ({ request }) => {
  await authenticator.isAuthenticated(request, {
    successRedirect: "/",
  });
  return {};
};

export default function LoginPage() {
  return (
    <Form method="post">
      <label>
        <span className="mr-2">Username</span>
        <input
          className="border rounded px-2 py-1 border-slate-300"
          type="text"
          name="username"
          required
        />
      </label>
      <label>
        <span className="mr-2">Password</span>
        <input
          className="border rounded px-2 py-1 border-slate-300"
          type="password"
          name="password"
          required
        />
      </label>
      <button>Log In</button>
    </Form>
  );
}
