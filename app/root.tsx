import { data, Outlet, useLoaderData } from "react-router";
import type { Route } from "./+types/root";
import { db } from "./.server/db";
import { getUserId } from "./.server/session";
import { Document } from "./components/document";
import { getUserId } from "./session.server";

export function links(): Route.LinkDescriptors {
  return [
    { rel: "preload", href: globalStylesHref, as: "style" },
    { rel: "stylesheet", href: globalStylesHref },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  let userId = await getUserId(request);

  if (typeof userId !== "string") {
    return data({ user: null });
  }

  let user = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      username: true,
      id: true,
    },
  });

  return data({ user });
}

export default function App() {
  return <Outlet />;
}

export function Layout({ children }: { children: React.ReactNode }) {
  let loaderData = useLoaderData<typeof loader>();

  return <Document user={loaderData.user}>{children}</Document>;
}

// export function CatchBoundary() {
//   let caught = useCatch();

//   switch (caught.status) {
//     case 401: {
//       return (
//         <Document title={`${caught.status} ${caught.statusText}`}>
//           <h1>
//             {caught.status} {caught.statusText}
//           </h1>
//         </Document>
//       );
//     }

//     case 404: {
//       return (
//         <Document title={`${caught.status} ${caught.statusText}`}>
//           <div className="flex min-h-full flex-col bg-white pt-16 pb-12">
//             <main className="mx-auto flex w-full max-w-7xl flex-grow flex-col justify-center px-4 sm:px-6 lg:px-8">
//               <div className="flex flex-shrink-0 justify-center">
//                 <a href="/" className="inline-flex">
//                   <span className="sr-only">wtf.rent</span>
//                 </a>
//               </div>
//               <div className="py-16">
//                 <div className="text-center">
//                   <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
//                     404 error
//                   </p>
//                   <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
//                     Page not found.
//                   </h1>
//                   <p className="mt-2 text-base text-gray-500">
//                     Sorry, we couldn’t find the page you’re looking for.
//                   </p>
//                   <div className="mt-6">
//                     <Link
//                       to="/"
//                       className="text-base font-medium text-indigo-600 hover:text-indigo-500"
//                     >
//                       Go back home<span aria-hidden="true"> &rarr;</span>
//                     </Link>
//                   </div>
//                 </div>
//               </div>
//             </main>
//           </div>
//         </Document>
//       );
//     }

//     default: {
//       throw new Error(
//         `Unexpected caught response with status: ${caught.status}`
//       );
//     }
//   }
// }

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
