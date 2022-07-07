import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useTransition } from "@remix-run/react";
import { db } from "~/db.server";
import { sessionStorage } from "~/session.server";

interface ActionData {
  error: string;
  field: "title" | "content";
}

export let action: ActionFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");
  if (!userId) return redirect("/login");

  let formData = await request.formData();

  let title = formData.get("title");
  let content = formData.get("content");

  if (typeof title !== "string" || !title.length) {
    return json<ActionData>(
      { field: "title", error: "Title is required" },
      { status: 400 }
    );
  }

  if (typeof content !== "string" || !content.length) {
    return json<ActionData>(
      { field: "content", error: "Body is required" },
      { status: 400 }
    );
  }

  let post = await db.post.create({
    data: {
      title,
      content,
      author: { connect: { id: userId } },
    },
  });

  return redirect(`/post/${post.id}`);
};

export let loader: LoaderFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");
  if (!userId) return redirect("/login");
  return {};
};

export default function JoinPage() {
  let action = useActionData<ActionData>();
  let transition = useTransition();
  let pendingForm = transition.submission;

  return (
    <main className="mx-auto max-w-7xl px-2 py-4 sm:px-6 lg:px-8">
      {action && (
        <pre>
          <code>{JSON.stringify(action, null, 2)}</code>
        </pre>
      )}
      <Form method="post">
        <fieldset className="flex flex-col space-y-4" disabled={!!pendingForm}>
          <label className="space-y-2">
            <span className="block">Title</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-1"
              type="text"
              name="title"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="block">Body</span>
            <textarea
              name="content"
              className="h-full w-full rounded border border-slate-300 px-2 py-1"
              rows={20}
            />
          </label>
        </fieldset>
        <button
          type="submit"
          className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Post
        </button>
      </Form>
    </main>
  );
}
