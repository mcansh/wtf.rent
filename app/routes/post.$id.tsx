import { Prisma } from "@prisma/client";
import clsx from "clsx";
import type { DataFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { differenceInMinutes, format } from "date-fns";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useLocation,
  useTransition,
} from "@remix-run/react";

import { db } from "~/db.server";
import { getUserId, requireUserId } from "~/session.server";

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

export async function loader({ request, params }: DataFunctionArgs) {
  let userId = await getUserId(request);

  let post = await db.post.findUnique({
    where: { id: params.id },
    select: postWithComments.select,
  });

  if (!post) {
    throw new Response(`Post with id ${params.id} not found`, { status: 404 });
  }

  let userCreatedPost = post.author?.id === userId;

  return json({
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
}

export async function action({ request, params }: DataFunctionArgs) {
  let userId = await requireUserId(request);
  let formData = await request.formData();

  let variant = formData.get("variant");

  if (variant === "delete-comment") {
    let commentId = formData.get("commentId");

    if (typeof commentId !== "string") {
      return json({ error: { other: "Invalid comment id" } }, { status: 400 });
    }

    let comment = await db.comment.findFirst({
      where: {
        authorId: userId,
        id: commentId,
        postId: params.id,
      },
    });

    if (!comment) {
      return json({ error: { other: "Comment not found" } }, { status: 404 });
    }

    if (userId !== comment.authorId) {
      return json(
        { error: { other: "You can only delete comments you've written" } },
        { status: 400 }
      );
    }

    if (differenceInMinutes(new Date(), comment.createdAt) > 20) {
      return json(
        {
          error: { other: "You can't delete a comment older than 20 minutes" },
        },
        { status: 400 }
      );
    }

    await db.comment.deleteMany({
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
      return json(
        { error: { comment: "comment is required" } },
        { status: 400 }
      );
    }

    await db.comment.create({
      data: {
        content,
        author: { connect: { id: userId } },
        post: { connect: { id: params.id } },
      },
    });
  }

  return redirect(`/post/${params.id}`);
}

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
  let location = useLocation();
  let data = useLoaderData<typeof loader>();
  let actionData = useActionData<typeof action>();
  let transition = useTransition();
  let pendingForm = transition.submission;

  return (
    <main className="mx-auto max-w-7xl px-2 py-4 sm:px-6 lg:px-8">
      {actionData && "other" in actionData.error && (
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
        <h2>Updated {data.post.updatedAt}</h2>
      </div>
      <div
        className="prose mb-6 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: data.post.content }}
      />

      <h3 className="font-lg font-medium">Comments</h3>
      <div className="space-y-2 divide-y">
        {data.post.comments.length ? (
          data.post.comments.map((comment) => {
            let commentAuthor = comment.author;
            return (
              <div key={comment.id}>
                <div
                  dangerouslySetInnerHTML={{ __html: comment.content }}
                  className="prose whitespace-pre-wrap"
                />
                <div className="flex space-x-4">
                  <p className="text-sm">{commentAuthor.username}</p>
                  <p className="text-sm">{comment.createdAt}</p>
                  {commentAuthor.id === data.userId && (
                    <Form method="post" className="text-sm">
                      <input
                        type="hidden"
                        name="variant"
                        value="delete-comment"
                      />
                      <input
                        type="hidden"
                        name="commentId"
                        value={comment.id}
                      />
                      <button type="submit">Delete</button>
                    </Form>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p>No comments yet.</p>
        )}
      </div>

      <div className={clsx(!data.userId && "relative")}>
        {!data.userId && (
          <p className="absolute top-1/2 left-1/2 z-10 -mt-2 w-full -translate-x-1/2 -translate-y-1/2 px-4 text-center">
            To leave a comment, you must be{" "}
            <Link
              className="text-indigo-600"
              to={`/login?returnTo=${location.pathname}${location.search}`}
            >
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
              className={clsx(
                actionData && "comment" in actionData.error
                  ? "text-red-500"
                  : ""
              )}
            >
              Leave a comment
            </label>
            <textarea
              className={clsx("block w-full", {
                "border-red-500": actionData && "comment" in actionData.error,
              })}
              id="content"
              name="content"
              rows={5}
            />
            {actionData && "comment" in actionData.error && (
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
