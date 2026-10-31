import { useMemo, useState } from "react"
import { AlertCircle, AlertTriangle, ArrowRight, Check, Copy, Lightbulb } from "lucide-react"
import { toast } from "sonner"
import { ReviewPromptDialog } from "@/components/prompt/ReviewPromptDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { describeTarget, type Issue, type Report, type Severity } from "@/lib/analysis/analyze"
import { resumeToPlainText } from "@/lib/analysis/plaintext"
import { copyText } from "@/lib/clipboard"
import { cn } from "@/lib/utils"
import { useEditorNav } from "@/state/editor-nav"
import { useWorkspace } from "@/state/workspace"

const GROUPS: { severity: Severity; label: string; icon: typeof AlertCircle; tone: string }[] = [
  { severity: "error", label: "Must fix", icon: AlertCircle, tone: "text-destructive" },
  { severity: "warning", label: "Should fix", icon: AlertTriangle, tone: "text-amber-600" },
  { severity: "tip", label: "Tips", icon: Lightbulb, tone: "text-sky-600" },
]

function scoreTone(score: number) {
  if (score >= 85) return { text: "text-emerald-600", bar: "bg-emerald-500", label: "Strong" }
  if (score >= 65) return { text: "text-amber-600", bar: "bg-amber-500", label: "Getting there" }
  return { text: "text-destructive", bar: "bg-destructive", label: "Needs work" }
}

function ScoreCard({ report }: { report: Report }) {
  const tone = scoreTone(report.score)
  const { stats, counts } = report
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">CV check</p>
            <p className="flex items-baseline gap-2">
              <span className={cn("text-4xl font-semibold tabular-nums", tone.text)}>{report.score}</span>
              <span className="text-sm text-muted-foreground">/ 100 · {tone.label}</span>
            </p>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            {counts.error} must fix · {counts.warning} should fix · {counts.tip} tips
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-label="CV score" aria-valuenow={report.score} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${report.score}%` }} />
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Pages", stats.pages ?? "–"],
            ["Words", stats.words],
            ["Bullets with numbers", `${stats.bulletsWithNumbers}/${stats.bullets}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-muted/60 px-2 py-2">
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Based on common recruiter and ATS guidance. It checks structure and wording, not whether you fit a job. For that, use Tailor.
        </p>
      </CardContent>
    </Card>
  )
}

function IssueRow({ issue, where }: { issue: Issue; where: string }) {
  const { goTo } = useEditorNav()
  return (
    <li className="flex gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{issue.title}</p>
        {issue.quote && <p className="mt-0.5 truncate text-xs text-muted-foreground italic">“{issue.quote}”</p>}
        {issue.detail && <p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p>}
        {where && <p className="mt-1 text-[11px] text-muted-foreground/80">{where}</p>}
      </div>
      <Button variant="ghost" size="sm" className="shrink-0" onClick={() => goTo({ section: issue.section, itemId: issue.itemId })}>
        Fix <ArrowRight />
      </Button>
    </li>
  )
}

function AtsTextCard() {
  const { resume } = useWorkspace()
  const [show, setShow] = useState(false)
  const text = useMemo(() => (show ? resumeToPlainText(resume) : ""), [show, resume])
  return (
    <Card>
      <CardHeader>
        <CardTitle>What an ATS reads</CardTitle>
        <CardDescription>
          Your CV as plain text, in reading order. If something is missing or out of order here, an applicant tracking system will see it that way too.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {show ? (
          <>
            <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{text}</pre>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={async () => ((await copyText(text)) ? toast.success("Copied") : toast.error("Couldn't copy"))}>
                <Copy /> Copy text
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShow(false)}>
                Hide
              </Button>
            </div>
          </>
        ) : (
          <Button variant="outline" size="sm" className="self-start" onClick={() => setShow(true)}>
            Show plain text
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function CheckPanel({ report }: { report: Report }) {
  const { resume } = useWorkspace()

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
        <ScoreCard report={report} />

        <Card>
          <CardHeader>
            <CardTitle>Get an AI second opinion</CardTitle>
            <CardDescription>
              Builds a prompt from your CV and these results for ChatGPT, Claude or Gemini. Your contact details are hidden by default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewPromptDialog report={report} />
          </CardContent>
        </Card>

        {report.issues.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 text-sm">
              <Check className="size-5 text-emerald-600" /> No issues found. Nice work.
            </CardContent>
          </Card>
        ) : (
          GROUPS.map(({ severity, label, icon: Icon, tone }) => {
            const issues = report.issues.filter((i) => i.severity === severity)
            if (!issues.length) return null
            return (
              <Card key={severity}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className={cn("size-4", tone)} /> {label}
                    <span className="text-sm font-normal text-muted-foreground tabular-nums">{issues.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {issues.map((issue, i) => (
                      <IssueRow key={`${issue.rule}-${issue.itemId ?? ""}-${i}`} issue={issue} where={describeTarget(resume, issue)} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })
        )}

        <AtsTextCard />
      </div>
    </div>
  )
}
