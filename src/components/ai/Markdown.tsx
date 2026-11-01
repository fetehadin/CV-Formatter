import { Fragment, type ReactNode } from "react"

/**
 * A deliberately small Markdown renderer for AI answers: headings, lists,
 * **bold**, `code` and tables. It builds React elements (never raw HTML), so
 * text from the AI can't inject scripts or markup into the page.
 */

function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (/^`[^`]+`$/.test(part)) return <code key={i} className="rounded bg-muted px-1 font-mono text-[0.9em]">{part.slice(1, -1)}</code>
    return <Fragment key={i}>{part}</Fragment>
  })
}

type Block = { kind: "h" | "p" | "ul" | "ol" | "table"; lines: string[]; level?: number }

function blocks(md: string): Block[] {
  const out: Block[] = []
  for (const raw of md.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd()
    const last = out.at(-1)
    if (!line.trim()) {
      out.push({ kind: "p", lines: [] })
      continue
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      out.push({ kind: "h", lines: [h[2]], level: h[1].length })
      continue
    }
    const kind: Block["kind"] = /^\s*\|/.test(line) ? "table" : /^\s*[-*•]\s+/.test(line) ? "ul" : /^\s*\d+[.)]\s+/.test(line) ? "ol" : "p"
    const text = kind === "ul" ? line.replace(/^\s*[-*•]\s+/, "") : kind === "ol" ? line.replace(/^\s*\d+[.)]\s+/, "") : line
    if (last && last.kind === kind && (kind !== "p" || last.lines.length)) last.lines.push(text)
    else out.push({ kind, lines: [text] })
  }
  return out.filter((b) => b.lines.length)
}

function Table({ lines }: { lines: string[] }) {
  const rows = lines.filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l)).map((l) => l.replace(/^\s*\||\|\s*$/g, "").split("|").map((c) => c.trim()))
  const [head, ...body] = rows
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>{head?.map((c, i) => <th key={i} className="border bg-muted/60 px-2 py-1 text-left font-medium">{inline(c)}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className="border px-2 py-1 align-top">{inline(c)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2">
      {blocks(text).map((b, i) => {
        if (b.kind === "h") return <p key={i} className="mt-1 font-semibold">{inline(b.lines[0])}</p>
        if (b.kind === "ul") return <ul key={i} className="list-disc space-y-0.5 pl-5">{b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}</ul>
        if (b.kind === "ol") return <ol key={i} className="list-decimal space-y-0.5 pl-5">{b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}</ol>
        if (b.kind === "table") return <Table key={i} lines={b.lines} />
        return <p key={i}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>
      })}
    </div>
  )
}
