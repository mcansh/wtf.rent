import { Prisma } from "@prisma/client";
import clsx from "clsx";
import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react";
import { differenceInMinutes, format } from "date-fns";

import prisma from "~/db.server";
import { sessionStorage } from "~/session.server";

let postWithComments = Prisma.validator<Prisma.PostArgs>()({
  select: {
    id: true,
    title: true,
    content: true,
    createdAt: true,
    updatedAt: true,
    author: { select: { id: true, username: true } },
    comments: {
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, username: true } },
      },
    },
  },
});

type PostWithComments = Prisma.PostGetPayload<typeof postWithComments>;

type Serialized<T> = {
  [P in keyof T]: T[P] extends Date ? string : Serialized<T[P]>;
};

interface RouteData {
  post: Serialized<PostWithComments>;
  userCreatedPost: boolean;
  userId: string | undefined;
}

interface ActionRouteData {
  error: {
    comment?: string;
    other?: string;
  };
}

export const loader: LoaderFunction = async ({ request, params }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");

  let post = await prisma.post.findUnique({
    where: { id: params.id },
    select: postWithComments.select,
  });

  if (!post) {
    throw new Response(`Post with id ${params.id} not found`, { status: 404 });
  }

  let userCreatedPost = post.author.id === userId;

  return json<RouteData>({
    post: {
      ...post,
      createdAt: format(post.createdAt, "yyyy-MM-dd HH:mm O"),
      updatedAt: format(post.updatedAt, "yyyy-MM-dd HH:mm O"),
      comments: post.comments.map((comment) => {
        return {
          ...comment,
          createdAt: format(comment.createdAt, "yyyy-MM-dd HH:mm O"),
        };
      }),
    },
    userCreatedPost,
    userId,
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");
  let formData = await request.formData();

  let variant = formData.get("variant");

  if (variant === "delete-comment") {
    let commentId = formData.get("commentId");

    if (typeof commentId !== "string") {
      return json<ActionRouteData>(
        { error: { other: "Invalid comment id" } },
        { status: 400 }
      );
    }

    let comment = await prisma.comment.findFirst({
      where: {
        authorId: userId,
        id: commentId,
        postId: params.id,
      },
    });

    if (!comment) {
      return json<ActionRouteData>(
        { error: { other: "Comment not found" } },
        { status: 404 }
      );
    }

    if (differenceInMinutes(new Date(), comment.createdAt) > 20) {
      return json<ActionRouteData>(
        {
          error: { other: "You can't delete a comment older than 20 minutes" },
        },
        { status: 400 }
      );
    }

    await prisma.comment.deleteMany({
      where: {
        id: commentId,
        authorId: userId,
        postId: params.id,
      },
    });
  }

  if (variant === "new-comment") {
    let content = formData.get("content");

    if (typeof content !== "string" || content.length === 0) {
      return json<ActionRouteData>(
        { error: { comment: "comment is required" } },
        { status: 400 }
      );
    }

    await prisma.comment.create({
      data: {
        content,
        author: { connect: { id: userId } },
        post: { connect: { id: params.id } },
      },
    });
  }

  return redirect(`/post/${params.id}`);
};

export const meta: MetaFunction = ({ data }) => {
  if (data && data.post) {
    return {
      title: `${data.post.title} | wtf.rent`,
    };
  }

  return {
    title: "404 Not Found | wtf.rent",
  };
};

export default function PostPage() {
  let data = useLoaderData<RouteData>();
  let actionData = useActionData<ActionRouteData>();
  let transition = useTransition();
  let pendingForm = transition.submission;

  return (
    <main className="mx-auto max-w-7xl px-2 py-4 sm:px-6 lg:px-8">
      {actionData?.error.other && (
        <pre className="py-4 text-red-500">
          <code>{actionData.error.other}</code>
        </pre>
      )}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="max-w-prose text-2xl font-semibold">
            {data.post.title}
          </h1>
          {data.userCreatedPost && <Link to="edit">Edit</Link>}
        </div>
        <h2>Posted {data.post.createdAt}</h2>
      </div>
      <div
        className="prose mb-6"
        dangerouslySetInnerHTML={{ __html: data.post.content }}
      />

      <h3 className="font-lg font-medium">Comments</h3>
      <div className="space-y-2 divide-y">
        {data.post.comments.length ? (
          data.post.comments.map((comment) => (
            <div key={comment.id}>
              <div
                dangerouslySetInnerHTML={{ __html: comment.content }}
                className="prose"
              />
              <div className="flex space-x-4">
                <p className="text-sm">{comment.author.username}</p>
                <p className="text-sm">{comment.createdAt}</p>
                {comment.author.id === data.userId && (
                  <Form method="post" className="text-sm">
                    <input
                      type="hidden"
                      name="variant"
                      value="delete-comment"
                    />
                    <input type="hidden" name="commentId" value={comment.id} />
                    <button type="submit">Delete</button>
                  </Form>
                )}
              </div>
            </div>
          ))
        ) : (
          <p>No comments yet.</p>
        )}
      </div>

      <div className={clsx(!data.userId && "relative")}>
        {!data.userId && (
          <p className="absolute top-1/2 left-1/2 z-10 -mt-2 w-full -translate-x-1/2 -translate-y-1/2 px-4 text-center">
            To leave a comment, you must be{" "}
            <Link className="text-indigo-600" to="/login">
              logged in
            </Link>
          </p>
        )}
        <Form
          method="post"
          className={clsx(!data.userId && "opacity-60", "mt-4")}
        >
          <fieldset disabled={!!pendingForm || !data.userId}>
            <label
              htmlFor="content"
              className={clsx(actionData?.error.comment ? "text-red-500" : "")}
            >
              Leave a comment
            </label>
            <textarea
              className={clsx("block w-full", {
                "border-red-500": actionData?.error.comment,
              })}
              id="content"
              name="content"
              rows={5}
            />
            {actionData?.error.comment && (
              <p className="text-red-500">{actionData.error.comment}</p>
            )}
            <button
              name="variant"
              value="new-comment"
              type="submit"
              className="mt-2 rounded border px-2 py-1"
            >
              Submit
            </button>
          </fieldset>
        </Form>
      </div>
    </main>
  );
}
