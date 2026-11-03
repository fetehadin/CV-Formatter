import "./App.css"
import { useCallback, useDeferredValue, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Download, FileUp, ShieldCheck, Sparkles } from "lucide-react"
import { AiSettingsDialog } from "@/components/ai/AiSettingsDialog"
import { CheckPanel } from "@/components/check/CheckPanel"
import { DataMenu } from "@/components/data/DataMenu"
import { ImportDialog } from "@/components/data/ImportDialog"
import { MoveNotice } from "@/components/data/MoveNotice"
import { DocumentSwitcher } from "@/components/documents/DocumentSwitcher"
import { Editor } from "@/components/editor/Editor"
import { usePageCount } from "@/components/preview/PageMeter"
import { PreviewPane } from "@/components/preview/PreviewPane"
import { PrintPageStyle, ResumePage } from "@/components/resume/ResumeDocument"
import { TailorPanel } from "@/components/tailor/TailorPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLocalState } from "@/hooks/use-local-state"
import { useMediaQuery } from "@/hooks/use-media-query"
import { analyzeResume, type IssueTarget } from "@/lib/analysis/analyze"
import { PAPERS } from "@/lib/resume/design"
import { exampleResume } from "@/lib/resume/example"
import { newDocument } from "@/lib/resume/workspace"
import { APP_NAME } from "@/lib/site"
import { cn } from "@/lib/utils"
import { EditorNavProvider, type NavRequest } from "@/state/editor-nav"
import { useAi } from "@/state/ai"
import { useWorkspace } from "@/state/workspace"

/** Opens the browser's print dialog ("Save as PDF"). The PDF file name comes from the page title. */
function printCv(name: string) {
  const previous = document.title
  document.title = name.trim() ? `${name.trim()} - CV` : "CV"
  window.addEventListener("afterprint", () => (document.title = previous), { once: true })
  window.print()
}

type View = "edit" | "preview" | "check" | "tailor"

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 85 ? "bg-emerald-100 text-emerald-800" : score >= 65 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
  return <Badge className={cn("tabular-nums", tone)}>{score}</Badge>
}

function ViewTabs({ value, onChange, views, score }: { value: View; onChange: (v: View) => void; views: View[]; score: number }) {
  const labels: Record<View, ReactNode> = {
    edit: "Edit",
    preview: "Preview",
    tailor: "Tailor",
    check: (
      <span className="flex items-center gap-1.5">
        Check <ScoreBadge score={score} />
      </span>
    ),
  }
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as View)}>
      <TabsList>
        {views.map((v) => (
          <TabsTrigger key={v} value={v}>
            {labels[v]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export default function App() {
  const { resume, doc, updateWorkspace } = useWorkspace()
  const ai = useAi()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [mobileView, setMobileView] = useState<View>("edit")
  const [sideView, setSideView] = useState<Exclude<View, "edit">>("preview")
  const [ui, setUi] = useLocalState("cvFormatter.ui", { designOpen: false })
  const setDesignOpen = useCallback((designOpen: boolean) => setUi((u) => ({ ...u, designOpen })), [setUi])

  const { pages, meter } = usePageCount(resume)
  // The check runs on a deferred copy, so typing never waits for it.
  const deferredResume = useDeferredValue(resume)
  const report = useMemo(() => analyzeResume(deferredResume, { pages }), [deferredResume, pages])

  const [importing, setImporting] = useState(false)
  const isBlank = !resume.basics.name.trim() && resume.experience.every((x) => !x.role && !x.company && !x.bullets.join("").trim())

  /** Opens a sample CV as its own version, so the user's own CV is never touched. */
  const loadExample = () => {
    const example = newDocument(exampleResume(), { title: "Example CV" })
    updateWorkspace((ws) => ({ ...ws, activeId: example.id, documents: [...ws.documents, example] }))
    toast("Example CV opened", { description: "Explore Check and Tailor. Switch back to your own CV from the menu at the top." })
  }

  const [navRequest, setNavRequest] = useState<NavRequest | null>(null)
  const goTo = useCallback(
    (target: IssueTarget) => {
      if (target.section === "design") {
        setSideView("preview")
        setMobileView("preview")
        setDesignOpen(true)
        return
      }
      setMobileView("edit")
      setNavRequest((prev) => ({ ...target, seq: (prev?.seq ?? 0) + 1 }))
    },
    [setDesignOpen],
  )
  const nav = useMemo(() => ({ request: navRequest, goTo }), [navRequest, goTo])

  const editor = (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        {isBlank && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-dashed bg-muted/40 p-4">
            <FileUp className="size-5 text-muted-foreground" aria-hidden />
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-medium">Have a CV already?</span> <span className="text-muted-foreground">Import a PDF, Word text or JSON instead of typing it all again.</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setImporting(true)}>
                Import
              </Button>
              <Button variant="ghost" size="sm" onClick={loadExample}>
                Try an example
              </Button>
            </div>
          </div>
        )}
        {/* Remount per CV version so open/closed entry state doesn't leak between versions. */}
        <Editor key={doc.id} />
        <p className="mt-6 flex items-center justify-center gap-1.5 pb-2 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden /> Saved only in this browser. No account, no tracking. Use “Back up all CVs” to keep a copy.
        </p>
      </div>
    </div>
  )
  const side = (view: View) =>
    view === "check" ? <CheckPanel report={report} /> : view === "tailor" ? <TailorPanel /> : <PreviewPane pages={pages} designOpen={ui.designOpen} onDesignOpenChange={setDesignOpen} />

  return (
    <EditorNavProvider value={nav}>
      <div id="app-root" className="flex h-dvh flex-col bg-background">
        <MoveNotice />
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            <img src="/favicon.svg" alt="" className="size-6 shrink-0" />
            <h1 className="hidden text-base font-semibold tracking-tight lg:block">{APP_NAME}</h1>
            <span className="hidden text-muted-foreground lg:block" aria-hidden>/</span>
            <DocumentSwitcher />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => ai.setSettingsOpen(true)}
              aria-label={ai.ready ? `AI connected: ${ai.providerLabel}. Change AI settings` : "Connect an AI (optional)"}
              title={ai.ready ? `AI: ${ai.providerLabel}` : "Connect an AI (optional)"}
              className="relative"
            >
              <Sparkles />
              {ai.ready && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background" aria-hidden />}
            </Button>
            <DataMenu onImport={() => setImporting(true)} />
            <Button onClick={() => printCv(resume.basics.name)} aria-label="Download PDF">
              <Download />
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1">
          {isDesktop ? (
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel defaultSize="45%" minSize="30%">
                {editor}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="55%" minSize="30%">
                <div className="flex h-full flex-col">
                  <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
                    <ViewTabs value={sideView} onChange={(v) => setSideView(v as Exclude<View, "edit">)} views={["preview", "check", "tailor"]} score={report.score} />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {pages} page{pages > 1 ? "s" : ""} · {PAPERS[resume.design.paper].label}
                    </span>
                  </div>
                  <div className="min-h-0 flex-1">{side(sideView)}</div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : mobileView === "edit" ? (
            editor
          ) : (
            side(mobileView)
          )}
        </main>
        {!isDesktop && (
          <nav aria-label="Views" className="flex shrink-0 justify-center border-t bg-background px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <ViewTabs value={mobileView} onChange={setMobileView} views={["edit", "preview", "check", "tailor"]} score={report.score} />
          </nav>
        )}
        {meter}
      </div>

      <ImportDialog open={importing} onOpenChange={setImporting} />
      <AiSettingsDialog />

      {/* Only visible when printing. */}
      <div id="print-root" aria-hidden>
        <PrintPageStyle resume={resume} />
        <ResumePage resume={resume} />
      </div>
    </EditorNavProvider>
  )
}
