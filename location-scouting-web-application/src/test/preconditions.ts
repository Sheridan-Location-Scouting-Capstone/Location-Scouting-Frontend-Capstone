
export class PreconditionError extends Error {
    readonly name = 'PreconditionError'
    constructor(readonly step: string, readonly cause: unknown) {
        super(`[BLOCKED] precondition failed: ${step}`, { cause });
    }
}

export async function given<T>(step: string, fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        throw new PreconditionError(step, error);
    }
}