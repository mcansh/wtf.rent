import { createCookieSessionStorage } from "remix";

let sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: ["s3cr3t"],
    secure: process.env.NODE_ENV === "production",
  },
});

let { commitSession, destroySession, getSession } = sessionStorage;

export { sessionStorage, commitSession, destroySession, getSession };
