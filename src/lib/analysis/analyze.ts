import { cleanBullets, formatRange, isEndBeforeStart, splitList, toMonthNumber } from "@/lib/resume/format"
import { SECTION_KEYS, SECTION_LABELS, type Resume, type SectionKey, type YearMonth } from "@/lib/resume/schema"
import { resumeToPlainText } from "./plaintext"
import { BUZZWORDS, FIRST_PERSON, isActionVerb, isStandardHeading, WEAK_OPENERS } from "./words"

/**
 * Rule-based CV checker. Deterministic and offline: the same CV always gets
 * the same result, and nothing is sent anywhere.
 */

export type Severity = "error" | "warning" | "tip"
/** Where "Fix" takes the user: a part of the editor, or the design panel. */
export type IssueTarget = { section: SectionKey | "basics" | "design"; itemId?: string }

export type Issue = IssueTarget & {
  /** Stable rule id, e.g. "bullet.weak-opener". */
  rule: string
  severity: Severity
  title: string
  detail?: string
  /** The text the issue is about, when there is one. */
  quote?: string
}

export type Report = {
  score: number
  issues: Issue[]
  counts: Record<Severity, number>
  stats: { words: number; bullets: number; bulletsWithNumbers: number; pages: number | null }
}

const PENALTY: Record<Severity, number> = { error: 12, warning: 5, tip: 2 }
/** One rule can't sink the score on its own. */
const RULE_CAP = 15

const HAS_METRIC = /\d|\b(doubled|tripled|halved|quadrupled|percent|million|thousand|hundred|dozen)\b/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const EMOJI = /\p{Extended_Pictographic}/u

const short = (s: string, n = 70) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

function words(s: string): string[] {
  return s.split(/\s+/).filter(Boolean)
}

function checkBullets(out: Issue[], section: SectionKey, itemId: string, label: string, bullets: string[]) {
  const clean = cleanBullets(bullets)
  if (clean.length === 0) return

  for (const b of clean) {
    const lower = b.toLowerCase()
    const weak = WEAK_OPENERS.find((w) => lower.startsWith(w))
    if (weak) {
      out.push({ rule: "bullet.weak-opener", severity: "warning", section, itemId, quote: short(b), title: `Starts with "${weak}"`, detail: "Describe what you achieved, not what you were assigned. Open with a verb like Built, Led or Reduced." })
    } else if (!isActionVerb(words(b)[0] ?? "")) {
      out.push({ rule: "bullet.no-action-verb", severity: "tip", section, itemId, quote: short(b), title: "Doesn't open with an action verb", detail: "Recruiters skim the first word. Start with a verb: Built, Designed, Cut, Grew…" })
    }
    if (b.length > 220) {
      out.push({ rule: "bullet.too-long", severity: "tip", section, itemId, quote: short(b), title: "Bullet is long", detail: `${b.length} characters. Aim for one or two lines (under ~200).` })
    } else if (words(b).length < 4) {
      out.push({ rule: "bullet.too-short", severity: "tip", section, itemId, quote: b, title: "Bullet is very short", detail: "Add what you did, how, and the result." })
    }
    if (FIRST_PERSON.test(b)) {
      out.push({ rule: "bullet.first-person", severity: "tip", section, itemId, quote: short(b), title: 'Uses "I" or "my"', detail: "CV bullets usually drop the pronoun: \"Built…\" instead of \"I built…\"." })
    }
  }

  const withNumbers = clean.filter((b) => HAS_METRIC.test(b)).length
  if (section === "experience" || section === "projects") {
    if (withNumbers === 0) {
      out.push({ rule: "entry.no-metrics", severity: "warning", section, itemId, title: `No numbers in ${label}`, detail: "Add at least one measurable result: users, %, time saved, money, team size." })
    }
    if (clean.length > 8) {
      out.push({ rule: "entry.too-many-bullets", severity: "tip", section, itemId, title: `${clean.length} bullets in ${label}`, detail: "Keep the 3–6 strongest. More gets skimmed." })
    }
  }

  const periods = clean.filter((b) => b.endsWith(".")).length
  if (periods > 0 && periods < clean.length) {
    out.push({ rule: "entry.inconsistent-periods", severity: "tip", section, itemId, title: `Mixed full stops in ${label}`, detail: "End every bullet with a full stop, or none." })
  }
}

function checkDates(out: Issue[], section: SectionKey, itemId: string, label: string, start: YearMonth, end: YearMonth, current: boolean, required: boolean) {
  if (isEndBeforeStart(start, end, current)) {
    out.push({ rule: "date.backwards", severity: "error", section, itemId, title: `End date is before start date in ${label}` })
  }
  if (required && !start.year) {
    out.push({ rule: "date.missing", severity: "warning", section, itemId, title: `No start date in ${label}`, detail: "ATS and recruiters use dates to work out your years of experience." })
  } else if (required && !current && !end.year) {
    out.push({ rule: "date.missing-end", severity: "tip", section, itemId, title: `No end date in ${label}`, detail: 'Add an end date, or switch on "I work here now".' })
  }
  const now = new Date()
  const startN = toMonthNumber(start)
  if (startN !== null && startN > now.getFullYear() * 12 + now.getMonth() + 1) {
    out.push({ rule: "date.future", severity: "warning", section, itemId, title: `Start date is in the future in ${label}` })
  }
}

export function analyzeResume(r: Resume, opts: { pages?: number | null } = {}): Report {
  const out: Issue[] = []
  const b = r.basics

  // --- Contact ---
  if (!b.name.trim()) out.push({ rule: "basics.name", severity: "error", section: "basics", title: "Add your name" })
  if (!b.email.trim()) out.push({ rule: "basics.email", severity: "error", section: "basics", title: "Add an email address", detail: "Recruiters can't reach you without one." })
  else if (!EMAIL.test(b.email.trim())) out.push({ rule: "basics.email-format", severity: "warning", section: "basics", quote: b.email, title: "Email address looks wrong" })
  if (!b.phone.trim()) out.push({ rule: "basics.phone", severity: "warning", section: "basics", title: "Add a phone number" })
  if (!b.location.trim()) out.push({ rule: "basics.location", severity: "tip", section: "basics", title: "Add your city and country", detail: "Many ATS filter candidates by location." })
  if (!b.linkedin.trim()) out.push({ rule: "basics.linkedin", severity: "tip", section: "basics", title: "Add your LinkedIn URL" })

  // --- Summary ---
  const summary = r.summary.trim()
  if (!summary) {
    out.push({ rule: "summary.missing", severity: "tip", section: "summary", title: "Add a short summary", detail: "2–4 sentences on who you are, your strongest skills and one result. It's the first thing read." })
  } else {
    const n = words(summary).length
    if (n > 90) out.push({ rule: "summary.long", severity: "warning", section: "summary", title: `Summary is ${n} words`, detail: "Keep it under ~80 words. Details belong in Experience." })
    if (FIRST_PERSON.test(summary)) out.push({ rule: "summary.first-person", severity: "tip", section: "summary", title: 'Summary uses "I" or "my"', detail: 'Write it without pronouns: "Frontend engineer with…"' })
  }

  // --- Experience ---
  const jobs = r.experience.filter((x) => x.role || x.company || cleanBullets(x.bullets).length)
  if (jobs.length === 0) {
    out.push({ rule: "experience.missing", severity: "warning", section: "experience", title: "No work experience yet", detail: "Add internships, freelance or volunteer work. If you have none, put Projects higher." })
  }
  for (const x of jobs) {
    const label = x.role || x.company || "a job"
    if (!x.role.trim()) out.push({ rule: "entry.no-title", severity: "error", section: "experience", itemId: x.id, title: `Add a job title for ${x.company || "this job"}` })
    if (!x.company.trim()) out.push({ rule: "entry.no-company", severity: "error", section: "experience", itemId: x.id, title: `Add the company for ${x.role || "this job"}` })
    checkDates(out, "experience", x.id, label, x.start, x.end, x.current, true)
    if (cleanBullets(x.bullets).length === 0) out.push({ rule: "entry.no-bullets", severity: "warning", section: "experience", itemId: x.id, title: `No bullet points for ${label}`, detail: "Add 3–5 points on what you built or improved, with results." })
    checkBullets(out, "experience", x.id, label, x.bullets)
  }

  // --- Education ---
  const schools = r.education.filter((e) => e.school || e.degree)
  if (schools.length === 0) out.push({ rule: "education.missing", severity: "tip", section: "education", title: "No education listed", detail: "Most ATS have an education field. Add your degree, bootcamp or diploma." })
  for (const e of schools) {
    const label = e.school || e.degree
    if (!e.degree.trim()) out.push({ rule: "entry.no-degree", severity: "warning", section: "education", itemId: e.id, title: `Add the degree or program for ${label}` })
    checkDates(out, "education", e.id, label, e.start, e.end, e.current, false)
    checkBullets(out, "education", e.id, label, e.bullets)
  }

  // --- Projects ---
  for (const p of r.projects.filter((p) => p.name)) {
    checkDates(out, "projects", p.id, p.name, p.start, p.end, p.current, false)
    if (cleanBullets(p.bullets).length === 0) out.push({ rule: "entry.no-bullets", severity: "tip", section: "projects", itemId: p.id, title: `Describe ${p.name}`, detail: "One or two points: what it does, your part, and a result." })
    checkBullets(out, "projects", p.id, p.name, p.bullets)
  }

  // --- Skills ---
  const skills = r.skills.flatMap((g) => splitList(g.items))
  if (skills.length === 0) {
    out.push({ rule: "skills.missing", severity: "warning", section: "skills", title: "Add your skills", detail: "ATS match the job's keywords against this list." })
  } else {
    const seen = new Map<string, string>()
    for (const s of skills) {
      const key = s.toLowerCase()
      if (seen.has(key)) out.push({ rule: "skills.duplicate", severity: "tip", section: "skills", quote: s, title: `"${s}" is listed twice` })
      seen.set(key, s)
    }
    if (skills.length > 40) out.push({ rule: "skills.too-many", severity: "tip", section: "skills", title: `${skills.length} skills listed`, detail: "Keep the ones relevant to the jobs you want. A long list hides your strengths." })
  }

  // --- Whole document ---
  const allText = [summary, ...jobs.flatMap((x) => x.bullets), ...r.projects.flatMap((p) => p.bullets)].join("\n").toLowerCase()
  for (const word of BUZZWORDS) {
    if (allText.includes(word)) out.push({ rule: "text.buzzword", severity: "tip", section: "summary", quote: word, title: `Cliché: "${word}"`, detail: "Show it with a result instead of claiming it." })
  }
  const everything = JSON.stringify(r)
  if (EMOJI.test(everything)) out.push({ rule: "text.emoji", severity: "warning", section: "basics", title: "Emoji or symbols found", detail: "Some ATS turn emoji into garbage characters. Remove them." })

  // "[X%]"-style gaps left over from an AI suggestion.
  const gaps = resumeToPlainText(r).match(/\[[^\]]{1,40}\]/g)
  if (gaps) out.push({ rule: "text.placeholder", severity: "error", section: "experience", quote: [...new Set(gaps)].join(" "), title: "Fill in the placeholders", detail: "Replace each [ ] gap with your real figure, or remove it before you send the CV." })

  const verbs = new Map<string, number>()
  for (const line of [...jobs, ...r.projects].flatMap((x) => cleanBullets(x.bullets))) {
    const first = words(line)[0]?.toLowerCase().replace(/[^a-z]/g, "")
    if (first && isActionVerb(first)) verbs.set(first, (verbs.get(first) ?? 0) + 1)
  }
  for (const [verb, n] of verbs) {
    if (n >= 4) out.push({ rule: "text.repeated-verb", severity: "tip", section: "experience", quote: verb, title: `"${verb[0].toUpperCase()}${verb.slice(1)}" opens ${n} bullets`, detail: "Vary your verbs so each point reads as a different achievement." })
  }

  const pages = opts.pages ?? null
  if (pages !== null && pages > 2) out.push({ rule: "length.pages", severity: "warning", section: "experience", title: `CV is ${pages} pages`, detail: "Aim for 1 page (under ~5 years' experience) or 2 at most." })
  if (pages !== null && pages === 2 && jobs.length <= 2) out.push({ rule: "length.junior", severity: "tip", section: "experience", title: "Two pages for an early career", detail: "With 1–2 roles, one page usually reads stronger. Cut the weakest points." })

  // --- Design ---
  const d = r.design
  if (d.fontSize < 9.5) {
    out.push({ rule: "design.small-text", severity: "tip", section: "design", title: `Text is ${d.fontSize} pt`, detail: "10–11 pt is easiest to read on screen and paper. Cut weak points rather than shrinking the text." })
  }
  for (const key of SECTION_KEYS) {
    const custom = d.headings[key]?.trim()
    if (custom && !isStandardHeading(key, custom)) {
      out.push({ rule: "design.heading", severity: "tip", section: "design", quote: custom, title: `"${custom}" isn't a standard section title`, detail: `ATS look for familiar titles to sort your CV. "${SECTION_LABELS[key]}" is the safest choice.` })
    }
  }

  // --- Score ---
  const perRule = new Map<string, number>()
  for (const issue of out) perRule.set(issue.rule, Math.min(RULE_CAP, (perRule.get(issue.rule) ?? 0) + PENALTY[issue.severity]))
  const penalty = [...perRule.values()].reduce((a, b) => a + b, 0)
  const score = Math.max(0, Math.min(100, 100 - penalty))

  const allBullets = [...jobs, ...schools, ...r.projects].flatMap((x) => cleanBullets(x.bullets))
  const textForCount = [summary, ...allBullets, ...skills].join(" ")
  const counts = { error: 0, warning: 0, tip: 0 }
  for (const i of out) counts[i.severity]++

  const order: Record<Severity, number> = { error: 0, warning: 1, tip: 2 }
  out.sort((a, b) => order[a.severity] - order[b.severity])

  return {
    score,
    issues: out,
    counts,
    stats: {
      words: words(textForCount).length,
      bullets: allBullets.length,
      bulletsWithNumbers: allBullets.filter((b) => HAS_METRIC.test(b)).length,
      pages,
    },
  }
}

/** A one-line label for an entry, used by the check panel ("Frontend Engineer · Chapa"). */
export function describeTarget(r: Resume, t: IssueTarget): string {
  if (!t.itemId) return t.section === "basics" ? "Personal details" : t.section === "design" ? "Design" : ""
  const x = r.experience.find((i) => i.id === t.itemId)
  if (x) return [x.role, x.company].filter(Boolean).join(" · ") || formatRange(x.start, x.end, x.current)
  const e = r.education.find((i) => i.id === t.itemId)
  if (e) return [e.degree, e.school].filter(Boolean).join(" · ")
  const p = r.projects.find((i) => i.id === t.itemId)
  return p?.name ?? ""
}
