import { useFitScale } from "@/hooks/use-fit-scale"
import { PAGE_WIDTH_PX, ResumePage } from "@/components/resume/ResumeDocument"
import { useWorkspace } from "@/state/workspace"

/**
 * Shows the A4 sheet scaled to fit the pane. Uses CSS `zoom` (not
 * `transform: scale`) so the scaled page also takes up less layout space —
 * no negative-margin tricks needed.
 */
export function PreviewPane() {
  const { resume } = useWorkspace()
  const { ref, scale } = useFitScale(PAGE_WIDTH_PX, 0)

  return (
    <div ref={ref} className="h-full overflow-auto bg-muted/60 px-6 py-8">
      <div className="mx-auto w-fit" style={{ zoom: scale }}>
        <ResumePage resume={resume} className="shadow-xl ring-1 ring-black/5" />
      </div>
    </div>
  )
}
