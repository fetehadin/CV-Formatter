import { useDeferredValue, useId, useMemo, useState, type ReactNode } from "react"
import { Check, CopyPlus, ExternalLink, Plus, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { STATUS_LABEL } from "@/components/documents/DocumentSwitcher"
import { PromptPreview } from "@/components/prompt/PromptPreview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useLocalState } from "@/hooks/use-local-state"
import { buildTailorPrompt } from "@/lib/analysis/prompts"
import { toHref } from "@/lib/resume/format"
import type { Resume } from "@/lib/resume/schema"
import { createTailoredCopy, emptyJob, JOB_STATUSES, jobLabel, updateJob, type JobStatus, type JobTarget } from "@/lib/resume/workspace"
import { addSkill, matchResume, onlyInSkills, type Importance, type KeywordMatch, type MatchResult } from "@/lib/tailor/match"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/state/workspace"

const DRAFT_KEY = "cvFormatter.tailorDraft"

const GROUPS: { importance: Importance; label: string; hint: string }[] = [
  { importance: "required", label: "Required", hint: "Listed under requirements or marked as a must." },
  { importance: "mentioned", label: "Mentioned", hint: "Appears in the job but not marked as required." },
  { importance: "preferred", label: "Nice to have", hint: "Marked as preferred, a bonus or a plus." },
]

function Field({ label, children, id }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function JobForm({ job, onChange, showStatus }: { job: JobTarget; onChange: (patch: Partial<JobTarget>) => void; showStatus: boolean }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company" id={`${id}-c`}>
          <Input id={`${id}-c`} value={job.company} placeholder="Chapa" onChange={(e) => onChange({ company: e.target.value })} />
        </Field>
        <Field label="Job title" id={`${id}-t`}>
          <Input id={`${id}-t`} value={job.title} placeholder="Frontend Engineer" onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
      </div>
      <div className={cn("grid gap-3", showStatus && "sm:grid-cols-[1fr_10rem]")}>
        <Field label="Job post link (optional)" id={`${id}-u`}>
          <div className="flex gap-2">
            <Input id={`${id}-u`} type="url" value={job.url} placeholder="https://…" onChange={(e) => onChange({ url: e.target.value })} />
            {job.url.trim() && (
              <Button variant="outline" size="icon" aria-label="Open job post" render={<a href={toHref(job.url)} target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink />
              </Button>
            )}
          </div>
        </Field>
        {showStatus && (
          <Field label="Status" id={`${id}-s`}>
            <NativeSelect id={`${id}-s`} className="w-full" value={job.status} onChange={(e) => onChange({ status: e.target.value as JobStatus })}>
              {JOB_STATUSES.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {STATUS_LABEL[s]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
      </div>
      <Field label="Job description" id={`${id}-d`}>
        <Textarea
          id={`${id}-d`}
          rows={8}
          value={job.description}
          placeholder="Paste the full job post here: responsibilities, requirements, nice-to-haves…"
          className="max-h-80"
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>
      {showStatus && (
        <Field label="Notes (only for you)" id={`${id}-n`}>
          <Textarea id={`${id}-n`} rows={2} value={job.notes} placeholder="Recruiter name, deadline, referral…" onChange={(e) => onChange({ notes: e.target.value })} />
        </Field>
      )}
    </div>
  )
}

function MatchSummary({ match }: { match: MatchResult }) {
  const found = match.keywords.filter((k) => k.found).length
  const score = match.score ?? 0
  const tone = score >= 75 ? "bg-emerald-500 text-emerald-600" : score >= 50 ? "bg-amber-500 text-amber-600" : "bg-destructive text-destructive"
  const [bar, text] = tone.split(" ")
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <p className="flex items-baseline gap-2">
          <span className={cn("text-4xl font-semibold tabular-nums", text)}>{match.score}%</span>
          <span className="text-sm text-muted-foreground">keyword match</span>
        </p>
        <p className="text-right text-xs text-muted-foreground">
          {found} of {match.keywords.length} keywords found
          {match.years && (
            <>
              <br />
              Asks for {match.years}
            </>
          )}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-label="Keyword match" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        Required skills count 3×, mentioned 2×, nice-to-have 1×. Aim for most required ones, but only claim what's true. A perfect copy of the job's words reads as fake.
      </p>
    </div>
  )
}

function KeywordGroups({ match, onAdd }: { match: MatchResult; onAdd: (name: string) => void }) {
  return (
    <div className="flex flex-col gap-5">
      {GROUPS.map(({ importance, label, hint }) => {
        const list = match.keywords.filter((k) => k.importance === importance)
        if (!list.length) return null
        const missing = list.filter((k) => !k.found)
        const found = list.filter((k) => k.found)
        return (
          <section key={importance} className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">
              {label}{" "}
              <span className="font-normal text-muted-foreground tabular-nums">
                {found.length}/{list.length}
              </span>
            </h4>
            <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>
            {found.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label={`${label} keywords in your CV`}>
                {found.map((k) => (
                  <FoundChip key={k.name} k={k} />
                ))}
              </ul>
            )}
            {missing.length > 0 && (
              <ul className="flex flex-col divide-y rounded-lg border" aria-label={`${label} keywords missing from your CV`}>
                {missing.map((k) => (
                  <li key={k.name} className="flex items-center gap-2 px-3 py-1.5">
                    <X className="size-3.5 shrink-0 text-destructive" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {k.name}
                      {!k.known && <span className="ml-1.5 text-xs text-muted-foreground">(repeated in the job)</span>}
                    </span>
                    <Button variant="ghost" size="xs" onClick={() => onAdd(k.name)} title="Only if you really have this skill">
                      <Plus /> I have this
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function FoundChip({ k }: { k: KeywordMatch }) {
  const thin = onlyInSkills(k)
  return (
    <li>
      <Badge
        variant="outline"
        className={cn("gap-1 border-emerald-200 bg-emerald-50 text-emerald-800", thin && "border-amber-200 bg-amber-50 text-amber-800")}
        title={thin ? "Only in your skills list. Show it in a bullet point too." : `Found in: ${k.where.join(", ")}`}
      >
        <Check aria-hidden /> {k.name}
        {thin && <span className="sr-only"> (only in skills list)</span>}
      </Badge>
    </li>
  )
}

function TailorPromptDialog({ resume, job, match }: { resume: Resume; job: JobTarget; match: MatchResult }) {
  const [open, setOpen] = useState(false)
  const [prefs, setPrefs] = useLocalState(`${DRAFT_KEY}.prompt`, { redactContact: true, coverLetter: false })
  const prompt = useMemo(() => (open ? buildTailorPrompt(resume, job, match, prefs) : ""), [open, resume, job, match, prefs])
  const ids = { r: useId(), c: useId() }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full sm:w-auto" />}>
        <Sparkles /> Build tailoring prompt
      </DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tailoring prompt</DialogTitle>
          <DialogDescription>
            Your CV, the job post and the keyword gaps in one prompt. It asks the AI to reword only what's true and to check with you before adding any skill.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <Switch id={ids.r} checked={prefs.redactContact} onCheckedChange={(redactContact) => setPrefs({ ...prefs, redactContact })} />
            <Label htmlFor={ids.r} className="text-sm font-normal">Hide my contact details</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id={ids.c} checked={prefs.coverLetter} onCheckedChange={(coverLetter) => setPrefs({ ...prefs, coverLetter })} />
            <Label htmlFor={ids.c} className="text-sm font-normal">Also draft a cover letter</Label>
          </div>
        </div>
        <PromptPreview prompt={prompt} />
      </DialogContent>
    </Dialog>
  )
}

export function TailorPanel() {
  const { doc, resume, updateResume, updateWorkspace } = useWorkspace()
  const [draft, setDraft] = useLocalState<JobTarget>(DRAFT_KEY, emptyJob())
  const isTailored = doc.job !== null
  const job = doc.job ?? draft

  const setJob = (patch: Partial<JobTarget>) => {
    if (isTailored) updateWorkspace((ws) => updateJob(ws, doc.id, patch))
    else setDraft({ ...draft, ...patch })
  }

  const description = useDeferredValue(job.description)
  const deferredResume = useDeferredValue(resume)
  const match = useMemo(
    () => (description.trim() ? matchResume(deferredResume, description, { exclude: [job.company] }) : null),
    [deferredResume, description, job.company],
  )

  const createCopy = () => {
    updateWorkspace((ws) => createTailoredCopy(ws, doc.id, { ...draft }))
    setDraft(emptyJob())
    toast.success(`Created “${jobLabel(draft)}”`, { description: "Edit this copy freely. Your base CV is unchanged." })
  }

  const addSkillConfirmed = (name: string) => {
    const before = resume
    updateResume((r) => addSkill(r, name))
    toast(`Added “${name}” to your skills`, {
      description: "Now show it in a bullet point where you used it.",
      action: { label: "Undo", onClick: () => updateResume(() => before) },
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>{isTailored ? "Target job" : "Tailor to a job"}</CardTitle>
            <CardDescription>
              {isTailored
                ? "This CV version is for one job. Edit it freely: your base CV stays as it was."
                : "Paste a job post to see which of its keywords your CV covers. Then make a copy just for this job, so your base CV stays clean."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <JobForm job={job} onChange={setJob} showStatus={isTailored} />
            {!isTailored && (
              <Button onClick={createCopy} disabled={!draft.description.trim()} className="self-start">
                <CopyPlus /> Make a copy for this job
              </Button>
            )}
          </CardContent>
        </Card>

        {match && match.keywords.length > 0 && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-4">
                <MatchSummary match={match} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Keywords</CardTitle>
                <CardDescription>
                  Green: in your CV. Amber: only in your skills list, so add a bullet that shows it. Red: missing. Use “I have this” only for skills you really have.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KeywordGroups match={match} onAdd={addSkillConfirmed} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rewrite with AI, honestly</CardTitle>
                <CardDescription>Get a prompt for ChatGPT, Claude or Gemini that rewords your CV for this job without inventing anything.</CardDescription>
              </CardHeader>
              <CardContent>
                <TailorPromptDialog resume={resume} job={job} match={match} />
              </CardContent>
            </Card>
          </>
        )}

        {match && match.keywords.length === 0 && (
          <Card>
            <CardContent className="text-sm text-muted-foreground">
              No known skills or repeated terms found in this text yet. Paste the full job post, including the requirements.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
