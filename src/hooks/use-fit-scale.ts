import { useCallback, useEffect, useState } from "react"

/**
 * Scale factor that fits a fixed-width page into whatever container it sits in.
 * `contentRect` already excludes the container's padding, so `gutterPx` is only
 * for extra breathing room.
 * Returns a callback ref, so it follows the element even when the layout swaps it.
 * Never scales up and never goes below `min`.
 */
export function useFitScale(pageWidthPx: number, gutterPx = 48, min = 0.3) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      if (width <= 0) return // hidden (display: none) — keep the last good value
      setScale(Math.max(min, Math.min(1, (width - gutterPx) / pageWidthPx)))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [el, pageWidthPx, gutterPx, min])

  const ref = useCallback((node: HTMLElement | null) => setEl(node), [])
  return { ref, scale }
}
