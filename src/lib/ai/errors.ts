/** An AI failure with a short, user-facing hint on what to do next. */
export class AiError extends Error {
  readonly hint?: string
  /** True when another model might work (retired, busy, too slow). */
  readonly tryAnotherModel: boolean
  constructor(message: string, hint?: string, tryAnotherModel = false) {
    super(message)
    this.hint = hint
    this.tryAnotherModel = tryAnotherModel
  }
}

/** Turns any thrown value into a message for a toast, or null when the user stopped it. */
export function describeAiError(err: unknown): AiError | null {
  if (err instanceof DOMException && err.name === "AbortError") return null
  const e = err instanceof AiError ? err : new AiError(err instanceof Error ? err.message : String(err))
  return e.message === "Stopped." ? null : e
}

/** The provider code (and the Anthropic SDK) loads only when an AI feature is first used. */
export const loadProviders = () => import("./providers")
