import crypto from "node:crypto";
import { promisify } from "node:util";

let asyncRandomBytes = promisify(crypto.randomBytes);

export async function getResetToken(): Promise<string> {
  let resetTokenBuffer = await asyncRandomBytes(20);
  return resetTokenBuffer.toString("hex");
}

export { hash, compare as verify } from "bcrypt";
