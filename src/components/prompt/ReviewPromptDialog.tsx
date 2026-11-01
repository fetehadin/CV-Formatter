import { useId, useMemo, useState } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { useLocalState } from "@/hooks/use-local-state"
import type { Report } from "@/lib/analysis/analyze"
import { buildReviewPrompt, LEVELS } from "@/lib/analysis/prompts"
import { useWorkspace } from "@/state/workspace"
import { PromptPreview } from "./PromptPreview"

export type ReviewPrefs = { targetRole: string; level: string; market: string; redactContact: boolean }
export const DEFAULT_REVIEW_PREFS: ReviewPrefs = { targetRole: "", level: "", market: "", redactContact: true }
export const REVIEW_PREFS_KEY = "cvFormatter.reviewPrefs"

export function ReviewOptions({ prefs, onChange }: { prefs: ReviewPrefs; onChange: (p: ReviewPrefs) => void }) {
  const ids = { role: useId(), level: useId(), market: useId(), redact: useId() }
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.role} className="text-xs text-muted-foreground">Target role</Label>
        <Input id={ids.role} value={prefs.targetRole} placeholder="Frontend Engineer" onChange={(e) => onChange({ ...prefs, targetRole: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.level} className="text-xs text-muted-foreground">Level</Label>
        <NativeSelect id={ids.level} className="w-full" value={prefs.level} onChange={(e) => onChange({ ...prefs, level: e.target.value })}>
          <NativeSelectOption value="">Not specified</NativeSelectOption>
          {LEVELS.map((l) => (
            <NativeSelectOption key={l} value={l}>{l}</NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.market} className="text-xs text-muted-foreground">Applying in</Label>
        <Input id={ids.market} value={prefs.market} placeholder="Ethiopia, Remote (EU)…" onChange={(e) => onChange({ ...prefs, market: e.target.value })} />
      </div>
      <div className="flex items-center gap-2 sm:col-span-3">
        <Switch id={ids.redact} checked={prefs.redactContact} onCheckedChange={(redactContact) => onChange({ ...prefs, redactContact })} />
        <Label htmlFor={ids.redact} className="text-sm font-normal">
          Hide my name, email, phone and links from the AI
        </Label>
      </div>
    </div>
  )
}

/** "Get an AI second opinion": builds a review prompt from the CV and the check results. */
export function ReviewPromptDialog({ report }: { report: Report }) {
  const { resume } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [prefs, setPrefs] = useLocalState<ReviewPrefs>(REVIEW_PREFS_KEY, DEFAULT_REVIEW_PREFS)
  const prompt = useMemo(() => (open ? buildReviewPrompt(resume, report, prefs) : ""), [open, resume, report, prefs])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full sm:w-auto" />}>
        <Sparkles /> Build AI review prompt
      </DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>AI review prompt</DialogTitle>
          <DialogDescription>
            A prompt made from your CV and the check results. Paste it into any AI chat for a second opinion. It tells the AI not to invent facts and to ask you for missing numbers.
          </DialogDescription>
        </DialogHeader>
        <ReviewOptions prefs={prefs} onChange={setPrefs} />
        <PromptPreview prompt={prompt} />
      </DialogContent>
    </Dialog>
  )
}
