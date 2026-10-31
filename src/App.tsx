import "./App.css"
import { useState } from "react"
import { Download, FileText } from "lucide-react"
import { Editor } from "@/components/editor/Editor"
import { PreviewPane } from "@/components/preview/PreviewPane"
import { ResumePage } from "@/components/resume/ResumeDocument"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useWorkspace } from "@/state/workspace"

/** Opens the browser's print dialog ("Save as PDF"). The PDF file name comes from the page title. */
function printCv(name: string) {
  const previous = document.title
  document.title = name.trim() ? `${name.trim()} - CV` : "CV"
  window.addEventListener("afterprint", () => (document.title = previous), { once: true })
  window.print()
}

type MobileView = "edit" | "preview"

export default function App() {
  const { resume } = useWorkspace()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [mobileView, setMobileView] = useState<MobileView>("edit")

  const editor = (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <Editor />
      </div>
    </div>
  )

  return (
    <>
      <div id="app-root" className="flex h-dvh flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" aria-hidden />
            <h1 className="text-base font-semibold tracking-tight">CV Formatter</h1>
          </div>

          {!isDesktop && (
            <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as MobileView)}>
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

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
                <PreviewPane />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : mobileView === "edit" ? (
            editor
          ) : (
            <PreviewPane />
          )}
        </main>
      </div>

      {/* Only visible when printing. */}
      <div id="print-root" aria-hidden>
        <ResumePage resume={resume} />
      </div>
    </>
  )
}
