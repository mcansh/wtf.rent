import {
  MetaFunction,
  LinksFunction,
  Link,
  LoaderFunction,
  useLoaderData,
  Form,
} from "remix";
import { json } from "remix-utils";
import { Prisma, User } from "@prisma/client";

import prisma from "~/db.server";
import stylesUrl from "~/styles/index.css";
import { sessionStorage } from "~/session.server";

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
  user?: {
    id: string;
  };
}

export let loader: LoaderFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");

  let posts = await prisma.post.findMany({
    include: {
      author: {
        select: {
          username: true,
        },
      },
    },
  });

  return json<RouteData>({ posts, user: userId ? { id: userId } : undefined });
};

export default function Index() {
  let data = useLoaderData<RouteData>();
  return (
    <>
      <nav>
        <h1>wtf.rent</h1>
        <p>put shitty landlords on blast.</p>
        {data.user ? (
          <Form method="post" action="/logout">
            <button type="submit">logout</button>
          </Form>
        ) : (
          <Link to="/login">login</Link>
        )}
      </nav>
      <main>
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
}
