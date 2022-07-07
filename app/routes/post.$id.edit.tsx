import type { Post } from "@prisma/client";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react";
import { db } from "~/db.server";
import { sessionStorage } from "~/session.server";

interface ActionData {
  error: string;
  field: "title" | "content";
}

export let action: ActionFunction = async ({ request, params }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");
  if (!userId) return redirect("/login");
  if (!params.id) throw new Error("params.id is required");

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

  let post = await db.post.update({
    where: { id: params.id },
    data: { title, content },
  });

  return redirect(`/post/${post.id}`);
};

interface RouteData {
  post: Pick<Post, "content" | "title">;
}

export let loader: LoaderFunction = async ({ request, params }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");
  if (!userId) return redirect("/login");

  let post = await db.post.findFirst({
    where: { authorId: userId, id: params.id },
  });

  if (!post) {
    throw new Response(`Post with id ${params.id} not found`, { status: 404 });
  }

  return json<RouteData>({ post });
};

export default function JoinPage() {
  let data = useLoaderData<RouteData>();
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
