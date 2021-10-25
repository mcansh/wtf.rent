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
      { statusCode: 400 }
    );
  }

  if (!content) {
    return json<ActionData>(
      { field: "content", error: "Body is required" },
      { statusCode: 400 }
    );
  }

  let post = await prisma.post.create({
    data: {
      title,
      content,
      author: {
        connect: {
          id: session.get(authenticator.sessionKey).id,
        },
      },
    },
  });

  return redirect(`/post/${post.id}`);
};

export let loader: LoaderFunction = async ({ request }) => {
  await authenticator.isAuthenticated(request);
  return {};
};

export default function JoinPage() {
  let action = useActionData<ActionData>();
  let transition = useTransition();
  let pendingForm = transition.submission;

  return (
    <Form method="post">
      <fieldset className="flex flex-col" disabled={!!pendingForm}>
        <label>
          <span className="mr-2">Title</span>
          <input
            className="border border-slate-300 rounded px-2 py-1"
            type="text"
            name="title"
            required
          />
        </label>
        <label>
          <span className="mr-2">Body</span>
          <textarea
            name="content"
            className="border border-slate-300 rounded px-2 py-1"
          />
        </label>
      </fieldset>
      <button>Post</button>
    </Form>
  );
}
