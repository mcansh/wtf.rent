import type { LinksFunction, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { format } from "date-fns";
import { db } from "~/db.server";
import stylesUrl from "~/styles/index.css";

export let meta: MetaFunction = () => {
  return {
    title: "wtf.rent",
    description: "put shitty landlords on blast",
  };
};

export let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export async function loader() {
  let posts = await db.post.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { username: true } } },
  });

  return json({
    posts: posts.map((post) => {
      return {
        ...post,
        formattedCreatedAt: format(post.createdAt, "M/d/yyyy h:mm a"),
        formattedUpdatedAt: format(post.updatedAt, "M/d/yyyy h:mm a"),
      };
    }),
  });
}

export default function IndexPage() {
  let data = useLoaderData<typeof loader>();
  return (
    <>
      <main className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <h1 className="pt-4 text-4xl font-semibold">wtf.rent</h1>
        <p className="text-xl">put shitty landlords on blast.</p>
        <div className="space-y-2">
          {data.posts.map((post) => (
            <div key={post.id} className="rounded bg-slate-200 px-2 py-4">
              <Link
                className="inline-block max-w-prose text-lg line-clamp-1 hover:underline"
                to={`post/${post.id}`}
              >
                <h2>{post.title}</h2>
              </Link>
              <p className="prose line-clamp-1">{post.content}</p>
              <p className="text-slate-900s text-sm">
                Posted by {post.author.username} on{" "}
                <time dateTime={post.createdAt}>{post.formattedCreatedAt}</time>
              </p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
