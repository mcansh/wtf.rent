import { ActionFunction, Form, LoaderFunction, redirect } from "remix";
import { json } from "remix-utils";
import { verify } from "~/bcrypt.server";
import prisma from "~/db.server";
import { sessionStorage } from "~/session.server";

export let action: ActionFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let requestBody = await request.text();
  let formData = new URLSearchParams(requestBody);

  let username = formData.get("username");
  let password = formData.get("password");

  if (!username) {
    return json(
      { field: "username", message: "Username is required" },
      { statusCode: 400 }
    );
  }

  if (!password) {
    return json(
      { field: "password", message: "Password is required" },
      { statusCode: 400 }
    );
  }

  let user = await prisma.user.findUnique({
    where: { username: username },
  });

  if (!user) {
    return json(
      { message: "Invalid username or password" },
      { statusCode: 400 }
    );
  }

  let valid = await verify(password, user.password);

  if (!valid) {
    return json(
      { message: "Invalid username or password" },
      { statusCode: 400 }
    );
  }

  session.set("userId", user.id);

  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
};

export let loader: LoaderFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");
  if (userId) return redirect("/");
  return {};
};

export default function LoginPage() {
  return (
    <Form method="post">
      <fieldset className="flex flex-col">
        <label>
          <span className="mr-2">Username</span>
          <input
            className="px-2 py-1 border rounded border-slate-300"
            type="text"
            name="username"
            required
          />
        </label>
        <label>
          <span className="mr-2">Password</span>
          <input
            className="px-2 py-1 border rounded border-slate-300"
            type="password"
            name="password"
            required
          />
        </label>
        <button>Log In</button>
      </fieldset>
    </Form>
  );
}
