import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import { ResumePage } from "@/components/resume/ResumeDocument"
import { pageGeometry, pagesForHeight, shrinkSteps, type Design } from "@/lib/resume/design"
import type { Resume } from "@/lib/resume/schema"

/**
 * Finds the least drastic design that prints the CV on one page, by rendering
 * each candidate off screen and measuring it. Real measurement, not an
 * estimate, so the result matches the PDF.
 *
 * Returns "fits" when it already fits, or null when even the tightest design
 * needs two pages (then the content has to get shorter).
 */
export function fitToOnePage(resume: Resume): Design | "fits" | null {
  const host = document.createElement("div")
  host.setAttribute("aria-hidden", "true")
  host.style.cssText = "position:fixed;top:0;left:-9999px;visibility:hidden;pointer-events:none"
  document.body.appendChild(host)
  const root = createRoot(host)

  const pages = (design: Design) => {
    flushSync(() => root.render(<ResumePage resume={{ ...resume, design }} style={{ minHeight: 0 }} />))
    const sheet = host.firstElementChild as HTMLElement | null
    return sheet ? pagesForHeight(sheet.getBoundingClientRect().height, pageGeometry(design)) : 1
  }

  try {
    if (pages(resume.design) === 1) return "fits"
    return shrinkSteps(resume.design).find((d) => pages(d) === 1) ?? null
  } finally {
    root.unmount()
    host.remove()
  }
}
