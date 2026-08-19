-- data-table/transaction: required
-- Baseline for fresh databases and databases previously migrated by Prisma.

create table if not exists "User" (
  "id" text not null,
  "username" text not null,
  "email" text not null,
  "password" text not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null,

  constraint "User_pkey" primary key ("id")
);

create unique index if not exists "User_username_key" on "User" ("username");
create unique index if not exists "User_email_key" on "User" ("email");

create table if not exists "Post" (
  "id" text not null,
  "title" text not null,
  "content" text not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null,
  "authorId" text not null,

  constraint "Post_pkey" primary key ("id"),
  constraint "Post_authorId_fkey"
    foreign key ("authorId")
    references "User" ("id")
    on delete restrict
    on update cascade
);

create table if not exists "Comment" (
  "id" text not null,
  "content" text not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null,
  "authorId" text not null,
  "postId" text not null,

  constraint "Comment_pkey" primary key ("id"),
  constraint "Comment_authorId_fkey"
    foreign key ("authorId")
    references "User" ("id")
    on delete restrict
    on update cascade,
  constraint "Comment_postId_fkey"
    foreign key ("postId")
    references "Post" ("id")
    on delete cascade
    on update cascade
);
