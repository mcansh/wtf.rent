import type { DataFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useTransition } from "@remix-run/react";

import { db } from "~/db.server";
import { requireUserId } from "~/session.server";

export async function action({ request }: DataFunctionArgs) {
  let userId = await requireUserId(request);
  let formData = await request.formData();
  let title = formData.get("title");
  let content = formData.get("content");

  if (typeof title !== "string" || !title.length) {
    return json(
      { field: "title", error: "Title is required" },
      { status: 400 }
    );
  }

  if (typeof content !== "string" || !content.length) {
    return json(
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
}

export async function loader({ request }: DataFunctionArgs) {
  await requireUserId(request);
  return {};
}

export default function JoinPage() {
  let actionData = useActionData<typeof action>();
  let transition = useTransition();
  let pendingForm = transition.submission;

  return (
    <main className="mx-auto max-w-7xl px-2 py-4 sm:px-6 lg:px-8">
      {actionData && (
        <pre>
          <code>{JSON.stringify(actionData, null, 2)}</code>
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
