import { useEffect, useRef, useState } from "react"
import { ResumePage } from "@/components/resume/ResumeDocument"
import { pageGeometry, pagesForHeight } from "@/lib/resume/design"
import type { Resume } from "@/lib/resume/schema"

/**
 * Renders an invisible, unscaled copy of the CV and measures it, so the page
 * count is known even when the preview isn't on screen (e.g. on phones).
 */
export function usePageCount(resume: Resume) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize[0].blockSize))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Paper and margins change the page size without changing the height, so count from both.
  const pages = height ? pagesForHeight(height, pageGeometry(resume.design)) : 1

  const meter = (
    <div aria-hidden className="pointer-events-none invisible fixed top-0 -left-[9999px]">
      <div ref={ref}>
        <ResumePage resume={resume} style={{ minHeight: 0 }} />
      </div>
    </div>
  )
  return { pages, meter }
}
