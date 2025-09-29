"use client";
import { useNonce } from "@mcansh/http-helmet/react";
import { clsx } from "clsx/lite";
import { Links, Meta } from "react-router";
import type { User } from "~/.server/generated/prisma/client";
import globalStylesHref from "~/app.css?url";
import { useMatches } from "~/utils/use-matches";
import { Nav } from "./nav";

interface DocumentProps {
  children: React.ReactNode;
  user?: Pick<User, "email" | "username" | "id"> | null;
}

export function Document({ children, user }: DocumentProps) {
  let matches = useMatches();
  let bodyClassName = matches
    .filter((match) => match.handle && match.handle.bodyClassName)
    .map((match) => match.handle.bodyClassName);

  let nonce = useNonce();

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href={globalStylesHref} precedence="high" />
        <Meta />
        <Links nonce={nonce} />
      </head>
      <body className={clsx("flex h-full flex-col", bodyClassName)}>
        <Nav user={user} />
        <div className="flex-auto">{children}</div>
      </body>
    </html>
  );
}
