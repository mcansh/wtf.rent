import { webcrypto } from "node:crypto";

import { hash, verify } from "@node-rs/bcrypt";

export const DUMMY_PASSWORD_HASH = "$2b$12$vJ1orAwyHYmqneb.rktQl.6xY2LbXZbNmv2LU4PeO5hrg14wmey.2"

export function hashPassword(password: Uint8Array | string): Promise<string> {
  return hash(password, 12)
}

export function verifyPassword(password: Uint8Array | string, passwordHash: Uint8Array | string): Promise<boolean> {
  return verify(password, passwordHash)
}

export async function getResetToken(): Promise<string> {
  let resetTokenBuffer = new Uint8Array(20)
  webcrypto.getRandomValues(resetTokenBuffer)
  return Buffer.from(resetTokenBuffer).toString("hex")
}
