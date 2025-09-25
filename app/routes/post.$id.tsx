import clsx from "clsx";
import { differenceInMinutes, format } from "date-fns";
import {
  data,
  Form,
  Link,
  redirect,
  useLocation,
  useNavigation,
} from "react-router";
import { db } from "~/.server/db";
import { getUserId, requireUserId } from "~/session.server";
import type { Route } from "./+types/post.$id";

export async function loader({ request, params }: Route.LoaderArgs) {
  let userId = await getUserId(request);

  let post = await db.post.findUnique({
    where: { id: params.id },
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

  if (!post) {
    throw new Response(`Post with id ${params.id} not found`, { status: 404 });
  }

  let userCreatedPost = post.author?.id === userId;

  return data({
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

export async function action({ request, params }: Route.ActionArgs) {
  let userId = await requireUserId(request);
  let formData = await request.formData();

  let variant = formData.get("variant");

  if (variant === "delete-comment") {
    let commentId = formData.get("commentId");

    if (typeof commentId !== "string") {
      return data({ error: { other: "Invalid comment id" } }, { status: 400 });
    }

    let comment = await db.comment.findFirst({
      where: {
        authorId: userId,
        id: commentId,
        postId: params.id,
      },
    });

    if (!comment) {
      return data({ error: { other: "Comment not found" } }, { status: 404 });
    }

    if (userId !== comment.authorId) {
      return data(
        { error: { other: "You can only delete comments you've written" } },
        { status: 400 },
      );
    }

    if (differenceInMinutes(new Date(), comment.createdAt) > 20) {
      return data(
        {
          error: { other: "You can't delete a comment older than 20 minutes" },
        },
        { status: 400 },
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
      return data(
        { error: { comment: "comment is required" } },
        { status: 400 },
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

export function meta({ data }: Route.MetaArgs): Route.MetaDescriptors {
  return [
    {
      title: `${data.post.title} | wtf.rent`,
    },
  ];
}

export default function PostPage({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  let location = useLocation();
  let navigation = useNavigation();
  let pendingForm = navigation.state === "submitting";

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
            {loaderData.post.title}
          </h1>
          {loaderData.userCreatedPost && <Link to="edit">Edit</Link>}
        </div>
        <h2>Posted {loaderData.post.createdAt}</h2>
        <h2>Updated {loaderData.post.updatedAt}</h2>
      </div>
      <div
        className="prose mb-6 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: loaderData.post.content }}
      />

      <h3 className="font-lg font-medium">Comments</h3>
      <div className="space-y-2 divide-y">
        {loaderData.post.comments.length ? (
          loaderData.post.comments.map((comment) => {
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
                  {commentAuthor.id === loaderData.userId && (
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

      <div className={clsx(!loaderData.userId && "relative")}>
        {!loaderData.userId && (
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
          className={clsx(!loaderData.userId && "opacity-60", "mt-4")}
        >
          <fieldset disabled={!!pendingForm || !loaderData.userId}>
            <label
              htmlFor="content"
              className={clsx(
                actionData && "comment" in actionData.error
                  ? "text-red-500"
                  : "",
              )}
            >
              Leave a comment
            </label>
            <textarea
              key={location.key}
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
