import { Outlet } from "@remix-run/react";
import type { RouteHandle } from "~/use-matches";
import { useAuthMatches } from "~/use-matches";

export let handle: RouteHandle = {
  bodyClassName: "bg-gray-50",
};

export default function AuthLayout() {
  let matches = useAuthMatches();

  let title = matches
    .filter((match) => match.handle && match.handle.title)
    .map((match) => match.handle.title)
    .join(" ");

  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {title}
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
