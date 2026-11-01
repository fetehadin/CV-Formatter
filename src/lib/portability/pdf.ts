/**
 * Reads the text layer of a PDF in the browser with pdf.js.
 * This module is loaded with dynamic import() only when the user imports a
 * PDF, so pdf.js (~1 MB) never slows down the first page load.
 */
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist"
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

GlobalWorkerOptions.workerSrc = workerUrl

type Item = { str: string; x: number; y: number; w: number; h: number }

export type PdfText = {
  text: string
  pages: number
  /** Characters a parser couldn't read: replacement chars, private-use glyphs. */
  unreadable: number
}

/** Groups text pieces into lines by their vertical position, then sorts each line left to right. */
export function itemsToLines(items: Item[]): string[] {
  const sorted = [...items].filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: Item[][] = []
  for (const item of sorted) {
    const line = lines.at(-1)
    const tolerance = Math.max(2, item.h * 0.5)
    if (line && Math.abs(line[0].y - item.y) <= tolerance) line.push(item)
    else lines.push([item])
  }
  return lines.map((line) => {
    line.sort((a, b) => a.x - b.x)
    let out = ""
    let end = -Infinity
    for (const piece of line) {
      // A wide horizontal gap (e.g. a right-aligned date) becomes " | " so it stays separate.
      const gap = piece.x - end
      if (out) out += gap > piece.h * 3 ? " | " : gap > piece.h * 0.15 && !out.endsWith(" ") && !piece.str.startsWith(" ") ? " " : ""
      out += piece.str
      end = piece.x + piece.w
    }
    return out.replace(/\s+/g, " ").trim()
  })
}

export async function readPdf(file: File): Promise<PdfText> {
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const pdf = await task.promise
  const allLines: string[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const items: Item[] = []
    for (const it of content.items) {
      if (!("str" in it)) continue
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: Math.abs(it.transform[3]) || it.height || 10 })
    }
    allLines.push(...itemsToLines(items), "")
  }
  const pages = pdf.numPages
  await task.destroy()
  const text = allLines.join("\n").trim()
  const unreadable = (text.match(/[\uFFFD\uE000-\uF8FF]/g) ?? []).length
  return { text, pages, unreadable }
}
