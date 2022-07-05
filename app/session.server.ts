import { createCookieSessionStorage } from "@remix-run/node";

export let sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: ["s3cr3t"],
    secure: process.env.NODE_ENV === "production",
  },
});
