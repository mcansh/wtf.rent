import type { User } from "@prisma/client";
import { hash, verify } from "~/bcrypt.server";
import { db } from "~/db.server";

export async function getUserById(id: User["id"]) {
  return db.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: User["email"]) {
  return db.user.findUnique({ where: { email } });
}

export async function createUser({
  email,
  password,
  username,
}: Pick<User, "email" | "password" | "username">) {
  return db.user.create({
    data: {
      email: email,
      password: await hash(password),
      username: username,
    },
  });
}

export async function deleteUserByEmail(email: User["email"]) {
  return db.user.delete({ where: { email } });
}

export async function verifyLogin(
  email: User["email"],
  password: User["password"]
) {
  let user = await getUserByEmail(email);
  if (!user) return null;
  let isValid = await verify(password, user.password);
  if (!isValid) return null;
  return user;
}
