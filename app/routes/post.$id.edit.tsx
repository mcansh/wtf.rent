import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react";

import { db } from "~/db.server";
import { requireUserId } from "~/session.server";

export async function action({ request, params }: ActionArgs) {
  if (!params.id) throw new Error("params.id is required");
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

  await db.post.updateMany({
    where: { id: params.id, authorId: userId },
    data: { title, content },
  });

  return redirect(`/post/${params.id}`);
}

export async function loader({ request, params }: LoaderArgs) {
  let userId = await requireUserId(request);

  let post = await db.post.findFirst({
    where: { authorId: userId, id: params.id },
    select: { title: true, content: true },
  });

  if (!post) {
    throw new Response(`Post with id ${params.id} not found`, { status: 404 });
  }

  return json({ post });
}

export default function JoinPage() {
  let data = useLoaderData<typeof loader>();
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
              defaultValue={data.post.title}
            />
          </label>
          <label className="space-y-2">
            <span className="block">Body</span>
            <textarea
              name="content"
              className="h-full w-full rounded border border-slate-300 px-2 py-1"
              rows={20}
              defaultValue={data.post.content}
            />
          </label>
        </fieldset>
        <button
          type="submit"
          className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Update
        </button>
      </Form>
    </main>
  );
}
