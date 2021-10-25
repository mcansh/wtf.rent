import {
  MetaFunction,
  LinksFunction,
  Link,
  LoaderFunction,
  useLoaderData,
} from "remix";
import { json } from "remix-utils";
import { Prisma, User } from "@prisma/client";

import prisma from "~/db.server";
import stylesUrl from "~/styles/index.css";
import { authenticator, sessionStorage } from "~/auth.server";

export let meta: MetaFunction = () => {
  return {
    title: "wtf.rent",
    description: "put shitty landlords on blast",
  };
};

export let links: LinksFunction = () => {
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
  user?: User;
}

export let loader: LoaderFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  console.log(session.get(authenticator.sessionKey));

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

export default function Index() {
  let data = useLoaderData<RouteData>();
  return (
    <main>
      <h1>wtf.rent</h1>
      <p>put shitty landlords on blast.</p>

      <div>
        {data.posts.map((post) => (
          <div key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
            <p>Posted by {post.author.username}</p>
            <Link to={post.id}>Read more</Link>
          </div>
        ))}
      </div>
    </main>
  );
}
