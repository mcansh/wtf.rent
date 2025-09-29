import * as z from "zod";

const envSchema = z.object({
  SESSION_SECRET: z
    .string()
    .min(1)
    .transform((s) => {
      return s.split(",").map((s) => s.trim());
    }),
  DATABASE_URL: z.url(),
});

export const env = envSchema.parse(process.env);
