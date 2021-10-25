import type { User } from "@prisma/client";
import clsx from "clsx";
import {
  ErrorBoundaryComponent,
  Link,
  LinksFunction,
  LoaderFunction,
  RouteComponent,
  useLoaderData,
  useMatches,
} from "remix";
import { Links, LiveReload, Meta, Outlet, Scripts, useCatch } from "remix";
import { Nav } from "./components/nav";
import prisma from "./db.server";
import { sessionStorage } from "./session.server";

import stylesUrl from "./styles/global.css";

let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

interface RouteData {
  user?: User;
}

let loader: LoaderFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let userId = session.get("userId");
  let user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;

  return { user };
};

interface DocumentProps {
  title?: string;
}

const Document: React.FC<DocumentProps> = ({ children, title }) => {
  let data = useLoaderData<RouteData | undefined>();
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
      <body className={clsx("h-full", bodyClassName)}>
        <Nav user={data?.user} />
        {children}
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
};

const App: RouteComponent = () => {
  return (
    <Document>
      <Outlet />
    </Document>
  );
};

const CatchBoundary: React.VFC = () => {
  let caught = useCatch();

  switch (caught.status) {
    case 401:
      return (
        <Document title={`${caught.status} ${caught.statusText}`}>
          <h1>
            {caught.status} {caught.statusText}
          </h1>
        </Document>
      );

    case 404:
      return (
        <Document title={`${caught.status} ${caught.statusText}`}>
          <div className="flex flex-col min-h-full pt-16 pb-12 bg-white">
            <main className="flex flex-col justify-center flex-grow w-full px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
              <div className="flex justify-center flex-shrink-0">
                <a href="/" className="inline-flex">
                  <span className="sr-only">wtf.rent</span>
                </a>
              </div>
              <div className="py-16">
                <div className="text-center">
                  <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">
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

    default:
      throw new Error(
        `Unexpected caught response with status: ${caught.status}`
      );
  }
};

const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
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
};

export default App;
export { CatchBoundary, ErrorBoundary, links, loader };
