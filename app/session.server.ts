import { createCookieSessionStorage } from "remix";

let sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: ["s3cr3t"],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
  },
});

let { commitSession, destroySession, getSession } = sessionStorage;

export { sessionStorage, commitSession, destroySession, getSession };
