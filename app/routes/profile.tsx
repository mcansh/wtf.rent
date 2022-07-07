import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { ExclamationCircleIcon } from "@heroicons/react/solid";
import { getSession, sessionStorage } from "~/session.server";
import { db } from "~/db.server";
import { useActionData } from "@remix-run/react";
import clsx from "clsx";
import { hash, getResetToken } from "~/bcrypt.server";

export async function loader({ request }: LoaderArgs) {
  let session = await getSession(request);
  let userId = session.get("userId");
  if (!userId) return redirect("/login");
  return {};
}

export async function action({ request }: ActionArgs) {
  let session = await getSession(request);
  let userId = session.get("userId");
  if (!userId) return redirect("/login");

  let formData = await request.formData();
  let email = formData.get("email");

  if (typeof email !== "string" || email.length === 0) {
    return json({ error: "you must confirm your account's email" });
  }

  let user = await db.user.findFirst({ where: { id: userId, email } });

  if (!user) {
    return json({ error: "no match" });
  }

  await db.$transaction(async (prisma) => {
    let anonymousUser = await prisma.user.findUnique({
      where: { username: "anonymous" },
    });

    if (!anonymousUser) {
      anonymousUser = await prisma.user.create({
        data: {
          username: "anonymous",
          email: "anonymous@wtf.rent",
          password: await hash(await getResetToken()),
        },
      });
    }

    await prisma.comment.updateMany({
      where: { authorId: userId },
      data: { authorId: anonymousUser.id },
    });

    await prisma.post.updateMany({
      where: { authorId: userId },
      data: { authorId: anonymousUser.id },
    });

    await prisma.user.delete({
      where: { id: userId },
    });
  });

  return redirect("/", {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
  });
}

export default function SettingsPage() {
  let actionData = useActionData<{ error?: string }>();

  return (
    <div className="mx-auto max-w-7xl px-2 pt-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold">Your Profile</h1>

      <form method="post" className="pt-6">
        <h2 className="text-2xl font-semibold">Delete My Account</h2>
        <p className="py-2 text-red-600">
          Note this will only delete your account, but not any of the posts or
          comments you&apos;ve made.
        </p>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Confirm Email
          </label>
          <div className="relative mt-1">
            <input
              type="email"
              name="email"
              id="email"
              className={clsx(
                "block w-full rounded-md shadow-sm sm:text-sm",
                actionData?.error
                  ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:outline-none focus:ring-red-500"
                  : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              )}
              placeholder="you@example.com"
              aria-invalid="true"
              aria-describedby={actionData?.error ? "email-error" : undefined}
            />

            {actionData?.error ? (
              <>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <ExclamationCircleIcon
                    className="h-5 w-5 text-red-500"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-2 text-sm text-red-600" id="email-error">
                  {actionData.error}
                </p>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Yup, I'm sure
          </button>
        </div>
      </form>
    </div>
  );
}
