import { useRef, useState } from "react"
import { Loader2, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { guardSuggestion } from "@/lib/ai/guard"
import { AiError, describeAiError, loadProviders } from "@/lib/ai/errors"
import { bulletAsk, BulletResultSchema, sourceText, summaryAsk, SummaryResultSchema, type BulletResult, type SummaryResult } from "@/lib/ai/tasks"
import { useAi } from "@/state/ai"
import { useWorkspace } from "@/state/workspace"
import { Suggestion } from "./Suggestion"

function showError(err: unknown) {
  const e = describeAiError(err)
  if (e) toast.error(e.message, { description: e.hint })
}

/** Button that opens AI settings first when no AI is connected. */
function AiButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  const { ready, setSettingsOpen } = useAi()
  return (
    <Button variant="outline" size="sm" className="self-start" disabled={disabled} onClick={() => (ready ? onClick() : setSettingsOpen(true))}>
      <Sparkles /> {label}
    </Button>
  )
}

type Entry = { title: string; current: boolean; bullets: string[] }

/** "Improve with AI" for the bullets of one entry: three rewrites per bullet, each fact-checked. */
export function ImproveBullets({ entry, onReplace }: { entry: Entry; onReplace: (index: number, text: string) => void }) {
  const { settings, providerLabel, onModelChange } = useAi()
  const { resume, doc } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)
  const [results, setResults] = useState<Record<number, BulletResult>>({})
  const abort = useRef<AbortController | null>(null)

  const lines = entry.bullets.map((text, index) => ({ text, index })).filter((l) => l.text.trim())
  const source = sourceText(resume)

  const improve = async (index: number) => {
    abort.current?.abort()
    abort.current = new AbortController()
    setBusy(index)
    try {
      const ask = bulletAsk(resume, entry, entry.bullets[index], doc.job)
      const { generateJson } = await loadProviders()
      const raw = await generateJson(settings, { ...ask, signal: abort.current.signal, onModelChange })
      const parsed = BulletResultSchema.safeParse(raw)
      if (!parsed.success) throw new AiError("The AI's answer was in the wrong shape.", "Try again, or pick a stronger model.")
      setResults((r) => ({ ...r, [index]: parsed.data }))
    } catch (err) {
      showError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <AiButton label="Improve with AI" disabled={!lines.length} onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) abort.current?.abort()
          setOpen(o)
        }}
      >
        <DialogContent className="flex max-h-[90dvh] flex-col gap-4 overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Improve bullets{entry.title ? `: ${entry.title}` : ""}</DialogTitle>
            <DialogDescription>
              Pick a bullet to get three rewrites from {providerLabel}. Each one is checked against your CV, and anything new is flagged.
            </DialogDescription>
          </DialogHeader>
          <ol className="flex flex-col gap-4">
            {lines.map(({ text, index }) => {
              const result = results[index]
              return (
                <li key={index} className="flex flex-col gap-2 rounded-xl border p-3">
                  <div className="flex items-start gap-3">
                    <p className="min-w-0 flex-1 text-sm">{text}</p>
                    <Button size="sm" variant={result ? "ghost" : "secondary"} disabled={busy !== null} onClick={() => improve(index)}>
                      {busy === index ? <Loader2 className="animate-spin" /> : <Sparkles />}
                      {result ? "Again" : "Improve"}
                    </Button>
                  </div>
                  {result && (
                    <div className="flex flex-col gap-2">
                      {result.variants.slice(0, 3).map((v, i) => (
                        <Suggestion
                          key={i}
                          text={v.text}
                          label={v.focus}
                          guard={guardSuggestion(v.text, source)}
                          onUse={() => {
                            onReplace(index, v.text)
                            setResults((r) => {
                              const next = { ...r }
                              delete next[index]
                              return next
                            })
                            toast.success("Bullet updated")
                          }}
                        />
                      ))}
                      {result.question && <p className="text-xs text-muted-foreground">To make it stronger: {result.question}</p>}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
          {busy !== null && (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => abort.current?.abort()}>
              <X /> Stop
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** "Draft with AI" for the summary. */
export function DraftSummary({ onUse }: { onUse: (text: string) => void }) {
  const { settings, providerLabel, onModelChange } = useAi()
  const { resume, doc } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SummaryResult | null>(null)
  const abort = useRef<AbortController | null>(null)

  const run = async () => {
    abort.current?.abort()
    abort.current = new AbortController()
    setBusy(true)
    try {
      const { generateJson } = await loadProviders()
      const raw = await generateJson(settings, { ...summaryAsk(resume, doc.job), signal: abort.current.signal, onModelChange })
      const parsed = SummaryResultSchema.safeParse(raw)
      if (!parsed.success) throw new AiError("The AI's answer was in the wrong shape.", "Try again, or pick a stronger model.")
      setResult(parsed.data)
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AiButton
        label={doc.job ? "Draft for this job with AI" : "Draft with AI"}
        onClick={() => {
          setOpen(true)
          if (!result) run()
        }}
      />
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) abort.current?.abort()
          setOpen(o)
        }}
      >
        <DialogContent className="flex max-h-[90dvh] flex-col gap-4 overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Draft a summary</DialogTitle>
            <DialogDescription>
              Written by {providerLabel} from your CV{doc.job ? " and the target job" : ""}, then checked against your CV.
            </DialogDescription>
          </DialogHeader>
          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Writing…
            </p>
          )}
          {result && !busy && (
            <>
              <Suggestion
                text={result.summary}
                guard={guardSuggestion(result.summary, sourceText(resume))}
                onUse={() => {
                  onUse(result.summary)
                  setOpen(false)
                  setResult(null)
                  toast.success("Summary updated")
                }}
              />
              {result.question && <p className="text-xs text-muted-foreground">To make it stronger: {result.question}</p>}
            </>
          )}
          <Button variant="outline" size="sm" className="self-start" disabled={busy} onClick={run}>
            <Sparkles /> {result ? "Try again" : "Write"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
