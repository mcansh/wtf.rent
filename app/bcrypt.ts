import { webcrypto } from "node:crypto"

import { hash as bcryptHash, verify as bcryptVerify } from "@node-rs/bcrypt"

export const DUMMY_PASSWORD_HASH = "$2b$12$vJ1orAwyHYmqneb.rktQl.6xY2LbXZbNmv2LU4PeO5hrg14wmey.2"

export function hashPassword(password: string): Promise<string> {
  return bcryptHash(password, 12)
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcryptVerify(password, passwordHash)
}

export async function getResetToken(): Promise<string> {
  let resetTokenBuffer = new Uint8Array(20)
  webcrypto.getRandomValues(resetTokenBuffer)
  return Buffer.from(resetTokenBuffer).toString("hex")
}

export { bcryptHash as hash, bcryptVerify as verify }
