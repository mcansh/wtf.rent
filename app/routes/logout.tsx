import { ActionFunction, LoaderFunction, redirect } from "remix";

import { sessionStorage } from "~/session.server";

export let action: ActionFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
};

export let loader: LoaderFunction = () => {
  throw new Response("", { status: 404 });
};
