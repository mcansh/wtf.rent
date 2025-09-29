import { data, Form, redirect, useNavigation } from "react-router";
import { db } from "~/.server/db";
import { requireUserId } from "~/.server/session";
import type { Route } from "./+types/post.new";

export async function action({ request }: Route.ActionArgs) {
  let userId = await requireUserId(request);
  let formData = await request.formData();
  let title = formData.get("title");
  let content = formData.get("content");

  if (typeof title !== "string" || !title.length) {
    return data(
      { field: "title", error: "Title is required" },
      { status: 400 },
    );
  }

  if (typeof content !== "string" || !content.length) {
    return data(
      { field: "content", error: "Body is required" },
      { status: 400 },
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

export async function loader({ request }: Route.LoaderArgs) {
  await requireUserId(request);
  return {};
}

export default function JoinPage({ actionData }: Route.ComponentProps) {
  let navigation = useNavigation();
  let pendingForm = navigation.state === "submitting";

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
          className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
        >
          Post
        </button>
      </Form>
    </main>
  );
}
