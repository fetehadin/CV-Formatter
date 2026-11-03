import type { SectionKey } from "@/lib/resume/schema"

/**
 * Word lists used by the CV checker. Plain data, so they are easy to review
 * and extend.
 */

/** Strong verbs to open a bullet. Past tense; present tense is matched by `isActionVerb`. */
export const ACTION_VERBS = new Set(
  `accelerated achieved acquired adapted administered advised advocated analyzed architected arranged assembled assessed
  audited authored automated balanced benchmarked boosted budgeted built calculated campaigned captured centralized chaired
  championed clarified coached collaborated collected compiled completed composed computed conceived conducted configured
  consolidated constructed consulted contributed controlled converted coordinated corrected created cultivated curated
  cut debugged decreased defined delegated delivered deployed designed detected developed devised diagnosed directed
  discovered documented doubled drafted drove earned edited educated eliminated enabled engineered enhanced established
  evaluated exceeded executed expanded expedited experimented facilitated finalized fixed forecasted formulated fostered
  founded gained generated grew guided halved handled headed hired identified implemented improved increased influenced
  initiated innovated inspected installed instituted integrated interviewed introduced invented investigated launched led
  lowered maintained managed mapped marketed maximized measured mentored merged migrated minimized mobilized modeled
  modernized monitored motivated negotiated onboarded operated optimized orchestrated organized outperformed overhauled
  oversaw partnered performed persuaded piloted pioneered planned presented prioritized produced programmed promoted
  proposed prototyped provided published raised ran rebuilt recommended reconciled recruited redesigned reduced refactored
  refined reorganized replaced reported represented researched resolved restructured revamped reviewed revised saved
  scaled scheduled screened secured selected served shaped shipped simplified sold solved spearheaded standardized
  steered streamlined strengthened structured supervised supported surpassed synthesized taught tested tracked trained
  transformed translated tripled troubleshot unified upgraded validated visualized volunteered won wrote`
    .split(/\s+/)
    .filter(Boolean),
)

/** Irregular present -> past, so "Lead the team" counts like "Led the team". */
const IRREGULAR: Record<string, string> = {
  build: "built", lead: "led", run: "ran", write: "wrote", drive: "drove", grow: "grew", win: "won", teach: "taught",
  sell: "sold", oversee: "oversaw", cut: "cut", troubleshoot: "troubleshot",
}

export function isActionVerb(word: string): boolean {
  const w = word.toLowerCase().replace(/[^a-z-]/g, "")
  if (!w) return false
  if (ACTION_VERBS.has(w)) return true
  const base = w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w // "builds" -> "build"
  if (IRREGULAR[base]) return true
  return ACTION_VERBS.has(`${base}ed`) || ACTION_VERBS.has(`${base}d`) || ACTION_VERBS.has(base.replace(/y$/, "ied"))
}

/** Openers that describe duties instead of results. */
export const WEAK_OPENERS = [
  "responsible for",
  "duties included",
  "duties include",
  "tasked with",
  "in charge of",
  "worked on",
  "helped",
  "assisted",
  "participated in",
  "involved in",
  "was part of",
  "handled various",
]

/** Clichés recruiters skip over. */
export const BUZZWORDS = [
  "hard-working",
  "hardworking",
  "team player",
  "detail-oriented",
  "detail oriented",
  "results-driven",
  "results driven",
  "go-getter",
  "self-starter",
  "think outside the box",
  "synergy",
  "dynamic",
  "passionate",
  "highly motivated",
  "proven track record",
  "best of breed",
  "rockstar",
  "ninja",
  "guru",
]

export const FIRST_PERSON = /\b(i|me|my|mine|myself)\b/i

/** Section titles ATS parsers recognise, beyond our defaults. Lowercase, "&" written as "and". */
const STANDARD_HEADINGS: Record<SectionKey, string[]> = {
  summary: ["summary", "professional summary", "profile", "professional profile", "career summary", "about me", "about", "objective", "career objective", "personal statement"],
  experience: ["experience", "work experience", "professional experience", "employment", "employment history", "work history", "career history", "relevant experience"],
  education: ["education", "education and training", "academic background", "qualifications", "academic qualifications"],
  projects: ["projects", "personal projects", "selected projects", "key projects", "academic projects", "side projects"],
  skills: ["skills", "technical skills", "key skills", "core skills", "core competencies", "competencies", "skills and tools"],
  certifications: ["certifications", "certificates", "licenses and certifications", "licences and certifications", "certifications and training", "courses"],
  languages: ["languages", "language skills"],
}

export function isStandardHeading(key: SectionKey, title: string): boolean {
  const t = title.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim()
  return STANDARD_HEADINGS[key].includes(t)
}
