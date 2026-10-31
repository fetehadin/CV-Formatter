import { cleanBullets, displayUrl, formatRange, formatYearMonth, splitList } from "@/lib/resume/format"
import { SECTION_LABELS, type Resume, type SectionKey } from "@/lib/resume/schema"

export type PlainTextOptions = {
  /** Replace email, phone and profile links with placeholders (for pasting into AI tools). */
  redactContact?: boolean
}

function sectionLines(key: SectionKey, r: Resume): string[] {
  const bullets = (list: string[]) => cleanBullets(list).map((b) => `- ${b}`)
  switch (key) {
    case "summary":
      return r.summary.trim() ? [r.summary.trim()] : []
    case "experience":
      return r.experience
        .filter((x) => x.role || x.company)
        .flatMap((x) => [
          [x.role, x.company].filter(Boolean).join(" | ") + suffix(formatRange(x.start, x.end, x.current), x.location),
          ...bullets(x.bullets),
          "",
        ])
    case "education":
      return r.education
        .filter((e) => e.school || e.degree)
        .flatMap((e) => [
          [e.degree, e.school].filter(Boolean).join(" | ") + suffix(formatRange(e.start, e.end, e.current), e.location),
          ...bullets(e.bullets),
          "",
        ])
    case "projects":
      return r.projects
        .filter((p) => p.name)
        .flatMap((p) => [
          p.name + suffix(formatRange(p.start, p.end, p.current)),
          ...(p.tech.trim() ? [`Tech: ${splitList(p.tech).join(", ")}`] : []),
          ...bullets(p.bullets),
          "",
        ])
    case "skills":
      return r.skills
        .map((g) => ({ name: g.name.trim(), list: splitList(g.items) }))
        .filter((g) => g.list.length)
        .map((g) => (g.name ? `${g.name}: ${g.list.join(", ")}` : g.list.join(", ")))
    case "certifications":
      return r.certifications
        .filter((c) => c.name)
        .map((c) => [c.name, c.issuer].filter(Boolean).join(", ") + suffix(formatYearMonth(c.date)))
    case "languages":
      return r.languages.filter((l) => l.language).map((l) => (l.fluency ? `${l.language} (${l.fluency})` : l.language))
  }
}

function suffix(...parts: string[]): string {
  const p = parts.filter(Boolean)
  return p.length ? ` (${p.join(", ")})` : ""
}

/**
 * The CV as plain text, in reading order — roughly what an ATS extracts
 * from the PDF. Also used as the CV text inside AI prompts.
 */
export function resumeToPlainText(r: Resume, opts: PlainTextOptions = {}): string {
  const b = r.basics
  const redact = opts.redactContact
  const contact = [
    b.location,
    b.phone && (redact ? "[PHONE]" : b.phone),
    b.email && (redact ? "[EMAIL]" : b.email),
    ...[b.linkedin, b.github, b.website].filter(Boolean).map((u) => (redact ? "[PROFILE LINK]" : displayUrl(u))),
  ].filter(Boolean)

  const out: string[] = [redact ? "[NAME]" : b.name.trim() || "(no name)"]
  if (b.headline.trim()) out.push(b.headline.trim())
  if (contact.length) out.push(contact.join(" | "))

  for (const key of r.sectionOrder) {
    const lines = sectionLines(key, r)
    if (!lines.length) continue
    while (lines.at(-1) === "") lines.pop()
    out.push("", SECTION_LABELS[key].toUpperCase(), ...lines)
  }
  return out.join("\n")
}
