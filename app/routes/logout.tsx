import { Form } from "react-router";

import { logout, requireUserId } from "~/session.server";
import type { Route } from "./+types/logout";

export async function action({ request }: Route.ActionArgs) {
  return logout(request);
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUserId(request, "/");
  return null;
}

export default function LogoutPage() {
  return (
    <div className="mx-auto grid h-full max-w-7xl place-items-center px-2 sm:px-6 lg:px-8">
      <Form method="post">
        <button
          type="submit"
          className="rounded bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Log out
        </button>
      </Form>
    </div>
  );
}
