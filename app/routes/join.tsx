import clsx from "clsx";
import {
  ActionFunction,
  Form,
  LoaderFunction,
  redirect,
  useActionData,
  useTransition,
} from "remix";
import { json } from "remix-utils";
import { authenticator, sessionStorage } from "~/auth.server";
import { hash } from "~/bcrypt.server";
import prisma from "~/db.server";

interface ActionData {
  error: string;
  field: "email" | "password" | "passwordConfirm" | "username";
}

export let action: ActionFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let requestBody = await request.text();
  let formData = new URLSearchParams(requestBody);

  let email = formData.get("email");
  let username = formData.get("username");
  let password = formData.get("password");
  let passwordConfirm = formData.get("passwordConfirm");

  if (!email) {
    return json<ActionData>(
      { field: "email", error: "Email is required" },
      { statusCode: 400 }
    );
  }

  if (!username) {
    return json<ActionData>(
      { field: "username", error: "Username is required" },
      { statusCode: 400 }
    );
  }

  if (!password) {
    return json<ActionData>(
      { field: "password", error: "Password is required" },
      { statusCode: 400 }
    );
  }

  if (!passwordConfirm) {
    return json<ActionData>(
      { field: "passwordConfirm", error: "Password confirmation is required" },
      { statusCode: 400 }
    );
  }

  if (password !== passwordConfirm) {
    return json<ActionData>(
      { field: "passwordConfirm", error: "Passwords do not match" },
      { statusCode: 400 }
    );
  }

  let user = await prisma.user.create({
    data: {
      email,
      password: await hash(password),
      username,
    },
  });

  session.set(authenticator.sessionKey, user);

  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
};

export let loader: LoaderFunction = async ({ request }) => {
  await authenticator.isAuthenticated(request, {
    successRedirect: "/",
  });

  return {};
};

export default function JoinPage() {
  let action = useActionData<ActionData>();
  let transition = useTransition();
  let pendingForm = transition.submission;
  return (
    <Form method="post">
      <h1>Join</h1>
      <fieldset className="flex flex-col" disabled={!!pendingForm}>
        <label>
          <span className="mr-2">Username</span>
          <input
            className={clsx(
              "border rounded px-2 py-1",
              action?.field === "username"
                ? "border-red-500"
                : "border-slate-300"
            )}
            type="text"
            name="username"
            required
            placeholder="mylandlordsux"
          />
        </label>
        <label>
          <span className="mr-2">Email</span>
          <input
            className={clsx(
              "border rounded px-2 py-1",
              action?.field === "email" ? "border-red-500" : "border-slate-300"
            )}
            type="email"
            name="email"
            required
            placeholder="mylandlordsux@wtf.rent"
          />
        </label>
        <label>
          <span className="mr-2">Password</span>
          <input
            className={clsx(
              "border rounded px-2 py-1",
              action?.field === "password"
                ? "border-red-500"
                : "border-slate-300"
            )}
            type="password"
            name="password"
            required
          />
        </label>
        <label>
          <span className="mr-2">Password Confirmation</span>
          <input
            className={clsx(
              "border rounded px-2 py-1",
              action?.field === "passwordConfirm"
                ? "border-red-500"
                : "border-slate-300"
            )}
            type="password"
            name="passwordConfirm"
            required
          />
        </label>
      </fieldset>
      <button>Join</button>
    </Form>
  );
}
