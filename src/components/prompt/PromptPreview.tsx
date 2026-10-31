import { Check, Copy, ExternalLink, Loader2, Play, Square } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Markdown } from "@/components/ai/Markdown"
import { Button } from "@/components/ui/button"
import { AI_CHATS, chatLink } from "@/lib/analysis/prompts"
import { describeAiError, loadProviders } from "@/lib/ai/errors"
import { REVIEW_SYSTEM } from "@/lib/ai/tasks"
import { copyText } from "@/lib/clipboard"
import { useAi } from "@/state/ai"

/**
 * Shows a ready prompt with "Copy" and "Open in …" buttons. Opening always
 * copies first, so the user can paste even when the chat app ignores the
 * pre-filled text.
 */
export function PromptPreview({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false)
  const { ready, settings, providerLabel, setSettingsOpen, onModelChange } = useAi()
  const [answer, setAnswer] = useState("")
  const [running, setRunning] = useState(false)
  const abort = useRef<AbortController | null>(null)

  /** Runs the prompt with the connected AI and streams the answer in. */
  const run = async () => {
    if (!ready) return setSettingsOpen(true)
    abort.current = new AbortController()
    setRunning(true)
    setAnswer("")
    try {
      const { streamText } = await loadProviders()
      await streamText(settings, { system: REVIEW_SYSTEM, prompt, signal: abort.current.signal, onModelChange }, setAnswer)
    } catch (err) {
      const e = describeAiError(err)
      if (e) toast.error(e.message, { description: e.hint })
    } finally {
      setRunning(false)
    }
  }

  const copy = async () => {
    const ok = await copyText(prompt)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } else {
      toast.error("Couldn't copy. Select the text and copy it by hand.")
    }
    return ok
  }

  const open = async (chat: (typeof AI_CHATS)[number]) => {
    await copy()
    const { href, prefilled } = chatLink(chat, prompt)
    window.open(href, "_blank", "noopener,noreferrer")
    toast.success(prefilled ? `Opened ${chat.name} with your prompt` : `Prompt copied. Paste it into ${chat.name}.`)
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <textarea
        readOnly
        value={prompt}
        aria-label="Generated prompt"
        className="min-h-56 flex-1 resize-none rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy prompt"}
        </Button>
        {AI_CHATS.map((chat) => (
          <Button key={chat.name} variant="outline" onClick={() => open(chat)}>
            {chat.name} <ExternalLink />
          </Button>
        ))}
        {running ? (
          <Button variant="secondary" onClick={() => abort.current?.abort()}>
            <Square /> Stop
          </Button>
        ) : (
          <Button variant="secondary" onClick={run} title={ready ? `Send to ${providerLabel}` : "Connect an AI first"}>
            <Play /> {ready ? `Run with ${providerLabel}` : "Run here…"}
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{prompt.length.toLocaleString()} characters</span>
      </div>
      {(answer || running) && (
        <section aria-label="AI answer" aria-live="polite" aria-busy={running} className="flex flex-col gap-2 rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {running && <Loader2 className="size-3.5 animate-spin" />} Answer from {providerLabel}
            </p>
            {answer && !running && (
              <Button variant="ghost" size="xs" onClick={async () => ((await copyText(answer)) ? toast.success("Copied") : toast.error("Couldn't copy"))}>
                <Copy /> Copy
              </Button>
            )}
          </div>
          <div className="max-h-[50dvh] overflow-y-auto text-sm leading-relaxed">{answer ? <Markdown text={answer} /> : "Thinking…"}</div>
          <p className="text-[11px] text-muted-foreground">AI can be wrong. Only change your CV where the advice is true for you.</p>
        </section>
      )}
    </div>
  )
}
