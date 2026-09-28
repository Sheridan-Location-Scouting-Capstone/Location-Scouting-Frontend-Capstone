/**
 * For states that should be impossible. A failed invariant is a bug, so it throws instead of returning a Result:
 * expected failures (not found, invalid input, ...) are Results; broken assumptions are exceptions.
 */
export function invariant(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(`Invariant failed: ${message}`)
}
