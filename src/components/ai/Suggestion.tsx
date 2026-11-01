import { AlertTriangle, Check, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { GuardResult } from "@/lib/ai/guard"
import { cn } from "@/lib/utils"

/** Shows the user's text with [placeholders] highlighted so they're impossible to miss. */
function Highlighted({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]{1,40}\])/g)
  return (
    <>
      {parts.map((p, i) =>
        /^\[.*\]$/.test(p) ? (
          <mark key={i} className="rounded bg-amber-100 px-0.5 text-amber-900">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

/** One AI suggestion with the honesty check's verdict and a Use button. */
export function Suggestion({ text, label, guard, onUse }: { text: string; label?: string; guard: GuardResult; onUse: () => void }) {
  const invented = [...guard.newNumbers, ...guard.newSkills]
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border p-3", !guard.ok && "border-amber-300 bg-amber-50/50")}>
      {label && <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>}
      <p className="text-sm leading-relaxed">
        <Highlighted text={text} />
      </p>
      {guard.ok ? (
        <p className="flex items-center gap-1.5 text-xs text-emerald-700">
          <ShieldCheck className="size-3.5" aria-hidden /> Uses only facts from your CV
        </p>
      ) : (
        <p className="flex items-start gap-1.5 text-xs text-amber-800" role="alert">
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            Adds things your CV doesn't say: <strong>{invented.join(", ")}</strong>. Use it only if that's true, and be ready to explain it in an interview.
          </span>
        </p>
      )}
      {guard.placeholders.length > 0 && (
        <p className="text-xs text-muted-foreground">Replace {guard.placeholders.join(", ")} with your real figure, or remove it.</p>
      )}
      <Button size="sm" variant={guard.ok ? "default" : "outline"} className="self-start" onClick={onUse}>
        <Check /> {guard.ok ? "Use this" : "Use anyway"}
      </Button>
    </div>
  )
}
