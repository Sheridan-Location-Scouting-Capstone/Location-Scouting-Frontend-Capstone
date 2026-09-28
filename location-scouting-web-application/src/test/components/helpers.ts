/**
 * Stand-in resolved value for a server action that succeeded. Real actions redirect on success and never return,
 * so their declared return type only covers failures.
 */
export const redirected = undefined as never
