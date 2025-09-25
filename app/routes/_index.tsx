import { format } from "date-fns";
import chatBubbleBottomCenterText from "heroicons/24/solid/chat-bubble-bottom-center-text.svg";
import { Link } from "react-router";

import { db } from "~/.server/db";
import type { Route } from "./+types/_index";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "wtf.rent" },
    { description: "put shitty landlords on blast" },
  ];
}

export async function ServerComponent() {
  let dbPosts = await db.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { username: true } },
      _count: { select: { comments: true } },
    },
  });

  let posts = dbPosts.map((post) => {
      return {
        ...post,
        createdAt: post.createdAt.toISOString(),
        formattedCreatedAt: format(post.createdAt, "M/d/yyyy h:mm a"),
        formattedUpdatedAt: format(post.updatedAt, "M/d/yyyy h:mm a"),
      };
    })

  return (
    <main className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
      <h1 className="pt-4 text-4xl font-semibold">wtf.rent</h1>
      <p className="text-xl">put shitty landlords on blast.</p>
      <div className="space-y-2">
        {posts.map((post) => (
          <div
            key={post.id}
            className="relative flex items-center justify-between rounded bg-slate-200 px-2 py-4"
          >
            <div>
              <Link
                className="line-clamp-1 inline-block max-w-prose text-lg hover:underline"
                to={`post/${post.id}`}
              >
                <h2>{post.title}</h2>
              </Link>
              <p className="prose line-clamp-1">{post.content}</p>
              <p className="text-slate-900 text-sm">
                Posted by {post.author.username} on{" "}
                <time dateTime={post.createdAt}>{post.formattedCreatedAt}</time>
              </p>
            </div>
            <div className="flex items-center space-x-2 text-slate-900">
              <svg className="h-6 w-6" aria-hidden>
                <use href={chatBubbleBottomCenterText} />
              </svg>
              <span className="not-sr-only text-sm">
                {post._count.comments}
              </span>
              <div className="sr-only">{post._count.comments} comments</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
