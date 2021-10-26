import { Post, Prisma } from "@prisma/client";
import * as React from "react";
import {
  RouteComponent,
  ActionFunction,
  LoaderFunction,
  MetaFunction,
  useLoaderData,
  Link,
  Form,
  useTransition,
} from "remix";
import { redirect } from "remix";
import { json } from "remix-utils";
import prisma from "~/db.server";

import { sessionStorage } from "~/session.server";

let postWithComments = Prisma.validator<Prisma.PostArgs>()({
  select: {
    id: true,
    title: true,
    content: true,
    createdAt: true,
    updatedAt: true,
    author: {
      select: {
        id: true,
        username: true,
      },
    },
    comments: {
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
  },
});

type PostWithComments = Prisma.PostGetPayload<typeof postWithComments>;

interface RouteData {
  post: PostWithComments;
  userCreatedPost: boolean;
}

const loader: LoaderFunction = async ({ request, params }) => {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );
  let userId = session.get("userId");

  let post = await prisma.post.findUnique({
    where: { id: params.id },
    select: postWithComments.select,
  });

  if (!post) {
    throw json({}, { status: 404 });
  }

  let userCreatedPost = post.author.id === userId;

  return json<RouteData>({ post, userCreatedPost });
};

const action: ActionFunction = async ({ request, params }) => {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );
  let userId = session.get("userId");
  const requestBody = await request.text();
  const formData = new URLSearchParams(requestBody);
  let content = formData.get("content");

  if (!content) return redirect(`/post/${params.id}`);

  await prisma.comment.create({
    data: {
      content,
      author: {
        connect: {
          id: userId,
        },
      },
      post: {
        connect: {
          id: params.id,
        },
      },
    },
  });

  return redirect(`/post/${params.id}`);
};

const meta: MetaFunction = ({ data }) => {
  if (data && data.post) {
    return {
      title: `${data.post.title} | wtf.rent`,
    };
  }

  return {
    title: "404 Not Found | wtf.rent",
  };
};

const PostPage: RouteComponent = () => {
  const data = useLoaderData<RouteData>();
  let transition = useTransition();
  let pendingForm = transition.submission;

  return (
    <main className="px-2 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold max-w-prose">
            {data.post.title}
          </h1>
          {data.userCreatedPost && <Link to="edit">Edit</Link>}
        </div>
        <h2>Posted {data.post.createdAt}</h2>
      </div>
      <div
        className="mb-6 prose"
        dangerouslySetInnerHTML={{ __html: data.post.content }}
      />

      <h3 className="font-medium font-lg">Comments</h3>
      <div className="space-y-2 divide-y">
        {data.post.comments.length ? (
          data.post.comments.map((comment) => (
            <div key={comment.id} className="">
              <div
                dangerouslySetInnerHTML={{ __html: comment.content }}
                className="prose"
              />
              <p className="text-sm">{data.post.author.username}</p>
            </div>
          ))
        ) : (
          <p>No comments yet.</p>
        )}
      </div>

      <Form method="post" className="mt-4">
        <fieldset disabled={!!pendingForm}>
          <label htmlFor="content">Leave a comment</label>
          <textarea
            className="block w-full"
            id="content"
            name="content"
            rows={5}
          />
          <button type="submit" className="px-2 py-1 mt-2 border rounded">
            Submit
          </button>
        </fieldset>
      </Form>
    </main>
  );
};

export default PostPage;
export { action, loader, meta };
