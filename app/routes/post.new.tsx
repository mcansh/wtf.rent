import {
  ActionFunction,
  Form,
  LoaderFunction,
  redirect,
  useActionData,
  useTransition,
} from "remix";
import { json } from "remix-utils";

import prisma from "~/db.server";
import { sessionStorage } from "~/session.server";

interface ActionData {
  error: string;
  field: "title" | "content";
}

export let action: ActionFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let requestBody = await request.text();
  let formData = new URLSearchParams(requestBody);

  let title = formData.get("title");
  let content = formData.get("content");

  if (!title) {
    return json<ActionData>(
      { field: "title", error: "Title is required" },
      { status: 400 }
    );
  }

  if (!content) {
    return json<ActionData>(
      { field: "content", error: "Body is required" },
      { status: 400 }
    );
  }

  let post = await prisma.post.create({
    data: {
      title,
      content,
      author: {
        connect: {
          id: session.get("userId"),
        },
      },
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
    <main className="px-2 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <Form method="post">
        <fieldset className="flex flex-col space-y-4" disabled={!!pendingForm}>
          <label className="space-y-2">
            <span className="block">Title</span>
            <input
              className="w-full px-2 py-1 border rounded border-slate-300"
              type="text"
              name="title"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="block">Body</span>
            <textarea
              name="content"
              className="w-full h-full px-2 py-1 border rounded border-slate-300"
              rows={20}
            />
          </label>
        </fieldset>
        <button
          type="submit"
          className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Post
        </button>
      </Form>
    </main>
  );
}
