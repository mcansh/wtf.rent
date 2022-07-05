import { Prisma } from "@prisma/client";
import clsx from "clsx";
import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData, useTransition } from "@remix-run/react";

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

interface RouteData {
  post: PostWithComments;
  userCreatedPost: boolean;
  loggedIn: boolean;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");

  let post = await prisma.post.findUnique({
    where: { id: params.id },
    select: postWithComments.select,
  });

  if (!post) {
    throw json({}, { status: 404 });
  }

  let userCreatedPost = post.author.id === userId;

  return json<RouteData>({ post, userCreatedPost, loggedIn: !!userId });
};

export const action: ActionFunction = async ({ request, params }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");
  let requestBody = await request.text();
  let formData = new URLSearchParams(requestBody);
  let content = formData.get("content");

  console.log({ userId });

  if (!content) return redirect(`/post/${params.id}`);

  await prisma.comment.create({
    data: {
      content,
      author: { connect: { id: userId } },
      post: { connect: { id: params.id } },
    },
  });

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
  let transition = useTransition();
  let pendingForm = transition.submission;

  return (
    <main className="mx-auto max-w-7xl px-2 py-4 sm:px-6 lg:px-8">
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
            <div key={comment.id} className="">
              <div
                dangerouslySetInnerHTML={{ __html: comment.content }}
                className="prose"
              />
              <p className="text-sm">{comment.author.username}</p>
            </div>
          ))
        ) : (
          <p>No comments yet.</p>
        )}
      </div>

      <div className={clsx(!data.loggedIn && "relative")}>
        {!data.loggedIn && (
          <p className="absolute top-1/2 left-1/2 z-10 -mt-2 w-full -translate-x-1/2 -translate-y-1/2 px-4 text-center">
            To leave a comment, you must be{" "}
            <Link className="text-indigo-600" to="/login">
              logged in
            </Link>
          </p>
        )}
        <Form
          method="post"
          className={clsx(!data.loggedIn && "opacity-60", "mt-4")}
        >
          <fieldset disabled={!!pendingForm || !data.loggedIn}>
            <label htmlFor="content">Leave a comment</label>
            <textarea
              className="block w-full"
              id="content"
              name="content"
              rows={5}
            />
            <button type="submit" className="mt-2 rounded border px-2 py-1">
              Submit
            </button>
          </fieldset>
        </Form>
      </div>
    </main>
  );
}
