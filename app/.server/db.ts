import { PrismaClient } from "./generated/prisma/client";

export let db = new PrismaClient();
