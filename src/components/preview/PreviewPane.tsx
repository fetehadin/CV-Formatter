import { CONTENT_PER_PAGE_PX, MM_TO_PX, PAGE_PADDING_Y_MM, PAGE_WIDTH_PX, ResumePage } from "@/components/resume/ResumeDocument"
import { useFitScale } from "@/hooks/use-fit-scale"
import { useWorkspace } from "@/state/workspace"

/**
 * Shows the A4 sheet scaled to fit the pane. Uses CSS `zoom` (not
 * `transform: scale`) so the scaled page also takes up less layout space —
 * no negative-margin tricks needed.
 *
 * Dashed lines mark roughly where each new printed page starts.
 */
export function PreviewPane({ pages }: { pages: number }) {
  const { resume } = useWorkspace()
  const { ref, scale } = useFitScale(PAGE_WIDTH_PX, 0)
  const padY = PAGE_PADDING_Y_MM * MM_TO_PX
  const breaks = Array.from({ length: pages - 1 }, (_, i) => padY + (i + 1) * CONTENT_PER_PAGE_PX)

  return (
    <div ref={ref} className="h-full overflow-auto bg-muted/60 px-6 py-8">
      <div className="relative mx-auto w-fit" style={{ zoom: scale }}>
        <ResumePage resume={resume} className="shadow-xl ring-1 ring-black/5" style={{ minHeight: 2 * padY + pages * CONTENT_PER_PAGE_PX }} />
        {breaks.map((top, i) => (
          <div key={top} className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-primary/30" style={{ top }}>
            <span className="absolute -top-3 right-2 rounded-sm bg-primary/80 px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground">
              Page {i + 2}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
