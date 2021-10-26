import {
  MetaFunction,
  LinksFunction,
  Link,
  LoaderFunction,
  useLoaderData,
  RouteComponent,
} from "remix";
import { json } from "remix-utils";
import { Prisma } from "@prisma/client";

import prisma from "~/db.server";
import stylesUrl from "~/styles/index.css";
import { format } from "date-fns";

let meta: MetaFunction = () => {
  return {
    title: "wtf.rent",
    description: "put shitty landlords on blast",
  };
};

let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

let postWithUser = Prisma.validator<Prisma.PostArgs>()({
  include: {
    author: {
      select: {
        username: true,
      },
    },
  },
});

type PostWithUser = Prisma.PostGetPayload<typeof postWithUser>;

interface RouteData {
  posts: Array<PostWithUser>;
}

let loader: LoaderFunction = async () => {
  let posts = await prisma.post.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      author: {
        select: {
          username: true,
        },
      },
    },
  });

  return json<RouteData>({ posts });
};

const IndexPage: RouteComponent = () => {
  let data = useLoaderData<RouteData>();
  return (
    <>
      <main className="px-2 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <h1 className="pt-4 text-4xl font-semibold">wtf.rent</h1>
        <p className="text-xl">put shitty landlords on blast.</p>
        <div className="space-y-2">
          {data.posts.map((post) => (
            <div key={post.id} className="px-2 py-4 rounded bg-slate-200">
              <Link
                className="inline-block text-lg hover:underline line-clamp-1 max-w-prose"
                to={`post/${post.id}`}
              >
                <h2>{post.title}</h2>
              </Link>
              <p className="prose line-clamp-1">{post.content}</p>
              <p className="text-sm text-slate-900s">
                Posted by{" "}
                <Link className="hover:underline" to={post.author.username}>
                  {post.author.username}
                </Link>{" "}
                on{" "}
                <time dateTime={String(post.createdAt)}>
                  {format(new Date(post.createdAt), "M/d/yyyy h:mm a")}
                </time>
              </p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
};

export default IndexPage;
export { links, loader, meta };
