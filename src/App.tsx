import "./App.css"
import { useCallback, useDeferredValue, useMemo, useState, type ReactNode } from "react"
import { Download, FileText } from "lucide-react"
import { CheckPanel } from "@/components/check/CheckPanel"
import { DocumentSwitcher } from "@/components/documents/DocumentSwitcher"
import { Editor } from "@/components/editor/Editor"
import { usePageCount } from "@/components/preview/PageMeter"
import { PreviewPane } from "@/components/preview/PreviewPane"
import { ResumePage } from "@/components/resume/ResumeDocument"
import { TailorPanel } from "@/components/tailor/TailorPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaQuery } from "@/hooks/use-media-query"
import { analyzeResume, type IssueTarget } from "@/lib/analysis/analyze"
import { cn } from "@/lib/utils"
import { EditorNavProvider, type NavRequest } from "@/state/editor-nav"
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
  const { resume, doc } = useWorkspace()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [mobileView, setMobileView] = useState<View>("edit")
  const [sideView, setSideView] = useState<Exclude<View, "edit">>("preview")

  const { pages, meter } = usePageCount(resume)
  // The check runs on a deferred copy, so typing never waits for it.
  const deferredResume = useDeferredValue(resume)
  const report = useMemo(() => analyzeResume(deferredResume, { pages }), [deferredResume, pages])

  const [navRequest, setNavRequest] = useState<NavRequest | null>(null)
  const goTo = useCallback((target: IssueTarget) => {
    setMobileView("edit")
    setNavRequest((prev) => ({ ...target, seq: (prev?.seq ?? 0) + 1 }))
  }, [])
  const nav = useMemo(() => ({ request: navRequest, goTo }), [navRequest, goTo])

  const editor = (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        {/* Remount per CV version so open/closed entry state doesn't leak between versions. */}
        <Editor key={doc.id} />
      </div>
    </div>
  )
  const side = (view: View) =>
    view === "check" ? <CheckPanel report={report} /> : view === "tailor" ? <TailorPanel /> : <PreviewPane pages={pages} />

  return (
    <EditorNavProvider value={nav}>
      <div id="app-root" className="flex h-dvh flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="size-5 shrink-0 text-primary" aria-hidden />
            <h1 className="hidden text-base font-semibold tracking-tight lg:block">CV Formatter</h1>
            <span className="hidden text-muted-foreground lg:block" aria-hidden>/</span>
            <DocumentSwitcher />
          </div>

          <Button onClick={() => printCv(resume.basics.name)} aria-label="Download PDF">
            <Download />
            <span className="hidden sm:inline">Download PDF</span>
          </Button>
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
                      {pages} page{pages > 1 ? "s" : ""} · A4
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

      {/* Only visible when printing. */}
      <div id="print-root" aria-hidden>
        <ResumePage resume={resume} />
      </div>
    </EditorNavProvider>
  )
}
