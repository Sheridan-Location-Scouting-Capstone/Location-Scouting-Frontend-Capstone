// Minimal structured logging for server code. Everything goes through here so the output format (and later a real
// logging backend) can be changed in one place.

type Level = 'error' | 'warn' | 'info'

function describe(error: unknown) {
    return error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error
}

function write(level: Level, scope: string, message: string, detail?: unknown) {
    const line = `[${scope}] ${message}`
    const args = detail === undefined ? [line] : [line, describe(detail)]
    if (level === 'error') console.error(...args)
    else if (level === 'warn') console.warn(...args)
    else console.info(...args)
}

export type Logger = {
    error: (message: string, detail?: unknown) => void
    warn: (message: string, detail?: unknown) => void
    info: (message: string, detail?: unknown) => void
}

/** A logger whose lines are prefixed with the scope, e.g. createLogger('candidateService') */
export function createLogger(scope: string): Logger {
    return {
        error: (message, detail) => write('error', scope, message, detail),
        warn: (message, detail) => write('warn', scope, message, detail),
        info: (message, detail) => write('info', scope, message, detail),
    }
}
