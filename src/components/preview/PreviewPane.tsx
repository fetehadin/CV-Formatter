import { ChevronUp, Palette } from "lucide-react"
import { DesignPanel } from "@/components/design/DesignPanel"
import { ResumePage } from "@/components/resume/ResumeDocument"
import { Button } from "@/components/ui/button"
import { useFitScale } from "@/hooks/use-fit-scale"
import { pageGeometry, PAPERS, TEMPLATE_INFO } from "@/lib/resume/design"
import { useWorkspace } from "@/state/workspace"

/**
 * Shows the sheet scaled to fit the pane. Uses CSS `zoom` (not
 * `transform: scale`) so the scaled page also takes up less layout space —
 * no negative-margin tricks needed.
 *
 * Dashed lines mark roughly where each new printed page starts. The design
 * panel sits above the sheet so changes show while you make them.
 */
export function PreviewPane({ pages, designOpen, onDesignOpenChange }: { pages: number; designOpen: boolean; onDesignOpenChange: (open: boolean) => void }) {
  const { resume } = useWorkspace()
  const g = pageGeometry(resume.design)
  const { ref, scale } = useFitScale(g.widthPx, 0)
  const breaks = Array.from({ length: pages - 1 }, (_, i) => g.padYPx + (i + 1) * g.contentPerPagePx)

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col border-b bg-background">
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <Button variant={designOpen ? "secondary" : "outline"} size="sm" aria-expanded={designOpen} onClick={() => onDesignOpenChange(!designOpen)}>
            {designOpen ? <ChevronUp /> : <Palette />} Design
          </Button>
          <span className="truncate text-xs text-muted-foreground">
            {TEMPLATE_INFO[resume.design.template].label} · {PAPERS[resume.design.paper].label} · {resume.design.fontSize} pt
          </span>
        </div>
        {designOpen && (
          <div className="max-h-[45dvh] overflow-y-auto border-t px-4 py-4">
            <DesignPanel />
          </div>
        )}
      </div>
      <div ref={ref} className="min-h-0 flex-1 overflow-auto bg-muted/60 px-6 py-8">
        <div className="relative mx-auto w-fit" style={{ zoom: scale }}>
          <ResumePage resume={resume} className="shadow-xl ring-1 ring-black/5" style={{ minHeight: 2 * g.padYPx + pages * g.contentPerPagePx }} />
          {breaks.map((top, i) => (
            <div key={top} className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-primary/30" style={{ top }}>
              <span className="absolute -top-3 right-2 rounded-sm bg-primary/80 px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground">
                Page {i + 2}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
