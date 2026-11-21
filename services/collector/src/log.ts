const levels = { error: 0, warn: 1, info: 2, debug: 3 } as const
export type LogLevel = keyof typeof levels

/** Minimal JSON-lines logger; journald captures stdout. */
export function createLogger(level: LogLevel) {
  const emit = (l: LogLevel) => (msg: string, fields: Record<string, unknown> = {}) => {
    if (levels[l] <= levels[level]) {
      console.log(JSON.stringify({ level: l, time: new Date().toISOString(), msg, ...fields }))
    }
  }
  return { error: emit('error'), warn: emit('warn'), info: emit('info'), debug: emit('debug') }
}
export type Logger = ReturnType<typeof createLogger>
