import { useId, useState, type ReactNode } from "react"
import { AlertTriangle, CheckCircle2, FileJson, FileText, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { mergeWorkspace, readJson } from "@/lib/portability/json"
import { parseCvText, type ParseResult } from "@/lib/portability/parse-text"
import { SECTION_LABELS, type Resume } from "@/lib/resume/schema"
import { newDocument } from "@/lib/resume/workspace"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/state/workspace"

type Source = "pdf" | "text" | "json"
type Result = ParseResult & { source: Source; rawText?: string; pdf?: { pages: number; unreadable: number } }
type Verdict = { tone: "good" | "warn" | "bad"; title: string; detail: string }

/** How readable a PDF is for an ATS, judged from what we could extract. */
function readability(r: Result): Verdict | null {
  if (r.source !== "pdf" || !r.pdf) return null
  const chars = (r.rawText ?? "").replace(/\s/g, "").length
  if (chars < 150)
    return { tone: "bad", title: "No readable text", detail: "This PDF is probably a scanned image or a picture of text. Most ATS can't read it either. Rebuild it here and export a text-based PDF." }
  if (r.pdf.unreadable > 5 || r.found.length < 2)
    return { tone: "warn", title: "Partly readable", detail: "Some text came out garbled or without clear section headings. An ATS may misread parts of it, often because of columns, tables, text boxes or special fonts." }
  return { tone: "good", title: "Readable", detail: "The text and main sections came out cleanly. An ATS should read this PDF without trouble." }
}

const TONE = {
  good: { icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  warn: { icon: AlertTriangle, cls: "border-amber-200 bg-amber-50 text-amber-900" },
  bad: { icon: XCircle, cls: "border-red-200 bg-red-50 text-red-900" },
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">{value || "–"}</dd>
    </div>
  )
}

function ResultView({ result, onCreate, onBack }: { result: Result; onCreate: () => void; onBack: () => void }) {
  const r: Resume = result.resume
  const verdict = readability(result)
  const [showText, setShowText] = useState(false)
  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
      {verdict && (
        <div className={cn("flex gap-3 rounded-lg border p-3", TONE[verdict.tone].cls)} role="status">
          {(() => {
            const Icon = TONE[verdict.tone].icon
            return <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
          })()}
          <div>
            <p className="text-sm font-medium">ATS readability: {verdict.title}</p>
            <p className="text-xs">{verdict.detail}</p>
          </div>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Name" value={r.basics.name} />
        <Stat label="Email" value={r.basics.email} />
        <Stat label="Jobs" value={r.experience.length} />
        <Stat label="Education" value={r.education.length} />
        <Stat label="Projects" value={r.projects.length} />
        <Stat label="Skills" value={r.skills.reduce((n, g) => n + g.items.split(",").filter((s) => s.trim()).length, 0)} />
        <Stat label="Sections found" value={result.found.map((k) => SECTION_LABELS[k]).join(", ")} />
        {result.pdf && <Stat label="Pages" value={result.pdf.pages} />}
      </dl>
      {result.warnings.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {result.rawText && (
        <div>
          <Button variant="link" size="sm" className="px-0" onClick={() => setShowText((v) => !v)}>
            {showText ? "Hide" : "Show"} the text we extracted
          </Button>
          {showText && <pre className="mt-2 max-h-60 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">{result.rawText}</pre>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Importing is a best guess. It becomes a new CV version, and your current CVs stay untouched. Check every section afterwards.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onCreate}>Create a new CV from this</Button>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  )
}

function FilePicker({ accept, label, icon, busy, onFile }: { accept: string; label: string; icon: ReactNode; busy: boolean; onFile: (f: File) => void }) {
  const id = useId()
  const [over, setOver] = useState(false)
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
        over && "border-primary bg-muted/50",
      )}
    >
      {busy ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : icon}
      <span className="text-sm font-medium">{busy ? "Reading…" : label}</span>
      <span className="text-xs text-muted-foreground">or drop the file here. It's read in your browser and never uploaded.</span>
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ""
        }}
      />
    </label>
  )
}

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { updateWorkspace } = useWorkspace()
  const [tab, setTab] = useState<Source>("pdf")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [pasted, setPasted] = useState("")
  const pasteId = useId()

  const close = () => {
    onOpenChange(false)
    setResult(null)
    setPasted("")
  }

  const readPdfFile = async (file: File) => {
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return toast.error("That isn't a PDF file.")
    setBusy(true)
    try {
      const { readPdf } = await import("@/lib/portability/pdf") // loads pdf.js only now
      const pdf = await readPdf(file)
      setResult({ ...parseCvText(pdf.text), source: "pdf", rawText: pdf.text, pdf: { pages: pdf.pages, unreadable: pdf.unreadable } })
    } catch (err) {
      console.error(err)
      toast.error("Couldn't read this PDF.", { description: "It may be password-protected or damaged." })
    } finally {
      setBusy(false)
    }
  }

  const readJsonFile = async (file: File) => {
    setBusy(true)
    try {
      const data = readJson(await file.text())
      if (data.kind === "unknown") {
        toast.error("This file isn't a CV we recognise.", { description: "Use a JSON Resume file or a CV Formatter backup." })
      } else if (data.kind === "backup") {
        updateWorkspace((ws) => mergeWorkspace(ws, data.workspace))
        toast.success(`Added ${data.workspace.documents.length} CV version${data.workspace.documents.length > 1 ? "s" : ""} from the backup`)
        close()
      } else {
        setResult({ resume: data.resume, found: [], warnings: [], source: "json" })
      }
    } finally {
      setBusy(false)
    }
  }

  const create = () => {
    if (!result) return
    const title = result.resume.basics.name ? `Imported – ${result.resume.basics.name}` : "Imported CV"
    const doc = newDocument(result.resume, { title })
    updateWorkspace((ws) => ({ ...ws, activeId: doc.id, documents: [...ws.documents, doc] }))
    toast.success(`Created “${title}”`, { description: "Check each section. The Check tab will point out gaps." })
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import a CV</DialogTitle>
          <DialogDescription>Start from your existing CV instead of typing it again. Everything happens in your browser.</DialogDescription>
        </DialogHeader>
        {result ? (
          <ResultView result={result} onCreate={create} onBack={() => setResult(null)} />
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as Source)} className="min-h-0">
            <TabsList>
              <TabsTrigger value="pdf">PDF</TabsTrigger>
              <TabsTrigger value="text">Paste text</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="pdf" className="flex flex-col gap-2 pt-2">
              <FilePicker accept="application/pdf,.pdf" label="Choose a PDF CV" icon={<FileText className="size-6 text-muted-foreground" />} busy={busy} onFile={readPdfFile} />
              <p className="text-xs text-muted-foreground">Also a free ATS test: you'll see how readable the PDF is for applicant tracking systems.</p>
            </TabsContent>
            <TabsContent value="text" className="flex flex-col gap-2 pt-2">
              <Label htmlFor={pasteId} className="text-xs text-muted-foreground">
                Paste your CV from Word, Google Docs or your LinkedIn profile
              </Label>
              <Textarea id={pasteId} rows={10} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={"Your Name\nCity, Country • you@example.com\n\nExperience\nCompany | Jan 2022 – Present\nJob title\n• What you did…"} />
              <Button className="self-start" disabled={!pasted.trim()} onClick={() => setResult({ ...parseCvText(pasted), source: "text" })}>
                Read this text
              </Button>
            </TabsContent>
            <TabsContent value="json" className="flex flex-col gap-2 pt-2">
              <FilePicker accept="application/json,.json" label="Choose a JSON file" icon={<FileJson className="size-6 text-muted-foreground" />} busy={busy} onFile={readJsonFile} />
              <p className="text-xs text-muted-foreground">
                Works with <a className="underline" href="https://jsonresume.org" target="_blank" rel="noopener noreferrer">JSON Resume</a> files from other tools, and with CV Formatter backups (which add all their CV versions).
              </p>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
