// @ts-ignore
import * as React from "react";
import clsx from "clsx";
import type { LinksFunction, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  useCatch,
  useLoaderData,
} from "@remix-run/react";
import type { User } from "@prisma/client";

import { Nav } from "./components/nav";
import { db } from "./db.server";
import { getUserId } from "./session.server";
import stylesUrl from "./styles/global.css";
import { useMatches } from "./utils";

export let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export async function loader({ request }: LoaderArgs) {
  let userId = await getUserId(request);

  if (typeof userId !== "string") {
    return json({ user: null });
  }

  let user = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      username: true,
      id: true,
    },
  });

  return json({ user });
}

interface DocumentProps {
  title?: string;
  children: React.ReactNode;
  user?: Pick<User, "email" | "username" | "id"> | null;
}

function Document({ children, title, user }: DocumentProps) {
  let matches = useMatches();
  let bodyClassName = matches
    .filter((match) => match.handle && match.handle.bodyClassName)
    .map((match) => match.handle.bodyClassName);

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        {title ? <title>{title}</title> : null}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className={clsx("flex h-full flex-col", bodyClassName)}>
        <Nav user={user} />
        <div className="flex-auto">{children}</div>
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
}

export default function App() {
  let data = useLoaderData<typeof loader>();
  return (
    <Document user={data.user}>
      <Outlet />
    </Document>
  );
}

export function CatchBoundary() {
  let caught = useCatch();

  switch (caught.status) {
    case 401: {
      return (
        <Document title={`${caught.status} ${caught.statusText}`}>
          <h1>
            {caught.status} {caught.statusText}
          </h1>
        </Document>
      );
    }

    case 404: {
      return (
        <Document title={`${caught.status} ${caught.statusText}`}>
          <div className="flex min-h-full flex-col bg-white pt-16 pb-12">
            <main className="mx-auto flex w-full max-w-7xl flex-grow flex-col justify-center px-4 sm:px-6 lg:px-8">
              <div className="flex flex-shrink-0 justify-center">
                <a href="/" className="inline-flex">
                  <span className="sr-only">wtf.rent</span>
                </a>
              </div>
              <div className="py-16">
                <div className="text-center">
                  <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                    404 error
                  </p>
                  <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                    Page not found.
                  </h1>
                  <p className="mt-2 text-base text-gray-500">
                    Sorry, we couldn’t find the page you’re looking for.
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/"
                      className="text-base font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Go back home<span aria-hidden="true"> &rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </Document>
      );
    }

    default: {
      throw new Error(
        `Unexpected caught response with status: ${caught.status}`
      );
    }
  }
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  return (
    <Document title="Uh-oh!">
      <h1>App Error</h1>
      <pre>{error.message}</pre>
      <p>
        Replace this UI with what you want users to see when your app throws
        uncaught errors.
      </p>
    </Document>
  );
}
