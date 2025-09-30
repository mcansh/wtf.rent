import type { Processor } from "bullmq";
import { Queue as BullQueue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { getResetToken, hash } from "./bcrypt";
import { db } from "./db";
import { env } from "./env";

type RegisteredQueue = {
  queue: BullQueue;
  worker: Worker;
};

const redis = new Redis(env.REDIS_URL, {maxRetriesPerRequest: null});

const registeredQueues = new Map<string, RegisteredQueue>();

export function Queue<Payload>(
  name: string,
  handler: Processor<Payload>,
): BullQueue<Payload> {
  const current = registeredQueues.get(name);
  if (current) return current.queue;

  const queue = new BullQueue<Payload>(name, { connection: redis });

  const worker = new Worker<Payload>(name, handler, { connection: redis });

  registeredQueues.set(name, { queue, worker });

  return queue;
}

type AccountDeletionPayload = {
  userId: string;
};

export const accountDeletionQueue = Queue<AccountDeletionPayload>(
  "account-deletion",
  async (job) => {
    await db.$transaction(async (prisma) => {
      let anonymousUser = await prisma.user.findUnique({
        where: { username: "anonymous" },
      });

      if (!anonymousUser) {
        anonymousUser = await prisma.user.create({
          data: {
            username: "anonymous",
            email: "anonymous@wtf.rent",
            password: await hash(await getResetToken(), 12),
          },
        });
      }

      await prisma.comment.updateMany({
        where: { authorId: job.data.userId },
        data: { authorId: anonymousUser.id },
      });

      await prisma.post.updateMany({
        where: { authorId: job.data.userId },
        data: { authorId: anonymousUser.id },
      });

      await prisma.user.delete({
        where: { id: job.data.userId },
      });
    });
  },
);
