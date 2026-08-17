import { getContext } from "remix/middleware/async-context"
import type { AuthState } from "remix/middleware/auth"

import type { User } from "../data/schema.ts"

export function getCurrentUser(auth: AuthState<User> = getContext().auth): User {
  if (!auth.ok) {
    throw new Error(
      "Expected an authenticated user. Make sure requireAuth() runs before this code.",
    )
  }

  return auth.identity
}

export function getCurrentUserSafely(auth: AuthState<User> = getContext().auth): User | null {
  return auth.ok ? auth.identity : null
}
