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
        <div>
          {data.posts.map((post) => (
            <div key={post.id}>
              <h2>{post.title}</h2>
              <p>{post.content}</p>
              <p>Posted by {post.author.username}</p>
              <Link to={`post/${post.id}`}>Read more</Link>
            </div>
          ))}
        </div>
      </main>
    </>
  );
};

export default IndexPage;
export { links, loader, meta };
