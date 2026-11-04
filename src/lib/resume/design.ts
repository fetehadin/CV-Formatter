import { z } from "zod"

/**
 * How a CV looks: template, type, spacing and paper. Stored on each CV
 * version (`resume.design`), so a tailored copy keeps its parent's look.
 *
 * Every option is ATS-safe: one column, real text, system fonts. Like the
 * rest of the schema, bad values fall back to the defaults instead of throwing.
 */

export const TEMPLATES = ["classic", "modern", "compact", "elegant"] as const
export type TemplateId = (typeof TEMPLATES)[number]

export const TEMPLATE_INFO: Record<TemplateId, { label: string; description: string }> = {
  classic: { label: "Classic", description: "Centred header, ruled headings. Safe everywhere." },
  modern: { label: "Modern", description: "Left-aligned, bold accent rules. Tech and startups." },
  compact: { label: "Compact", description: "Title and company on one line. Fits more on a page." },
  elegant: { label: "Elegant", description: "Spaced capitals, centred headings. Pairs with a serif." },
}

/** System fonts only, so the PDF looks the same on any machine and every ATS can read it. */
export const FONTS = {
  arial: { label: "Arial", kind: "Sans-serif", stack: 'Arial, Helvetica, "Liberation Sans", sans-serif' },
  calibri: { label: "Calibri", kind: "Sans-serif", stack: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' },
  verdana: { label: "Verdana", kind: "Sans-serif", stack: 'Verdana, "DejaVu Sans", Geneva, sans-serif' },
  georgia: { label: "Georgia", kind: "Serif", stack: 'Georgia, "DejaVu Serif", "Times New Roman", serif' },
  garamond: { label: "Garamond", kind: "Serif", stack: 'Garamond, "EB Garamond", "Times New Roman", serif' },
  times: { label: "Times New Roman", kind: "Serif", stack: '"Times New Roman", Times, "Liberation Serif", serif' },
} as const
export type FontId = keyof typeof FONTS
const FONT_IDS = Object.keys(FONTS) as [FontId, ...FontId[]]

export const ACCENTS = [
  { label: "Navy", value: "#1E3A8A" },
  { label: "Black", value: "#111827" },
  { label: "Slate", value: "#334155" },
  { label: "Teal", value: "#0F766E" },
  { label: "Green", value: "#166534" },
  { label: "Burgundy", value: "#7F1D1D" },
  { label: "Plum", value: "#5B21B6" },
] as const

export const SPACINGS = { compact: 0.7, normal: 1, relaxed: 1.3 } as const
export type Spacing = keyof typeof SPACINGS

/** Sheet padding in mm. The vertical value repeats on every printed page. */
export const MARGINS = { narrow: { x: 10, y: 8 }, normal: { x: 14, y: 12 }, wide: { x: 19, y: 16 } } as const
export type Margins = keyof typeof MARGINS

export const PAPERS = {
  a4: { label: "A4", css: "A4", widthMm: 210, heightMm: 297 },
  letter: { label: "US Letter", css: "letter", widthMm: 215.9, heightMm: 279.4 },
} as const
export type Paper = keyof typeof PAPERS

export const DATE_STYLES = ["short", "long", "numeric"] as const
export type DateStyle = (typeof DATE_STYLES)[number]

export const FONT_SIZE = { min: 9, max: 12, step: 0.5 } as const

/**
 * Career stage. It sets a sensible section order, and how much each section
 * counts in the CV score: for a student, education and projects carry the
 * weight that work experience carries for an experienced hire.
 */
export const PROFILES = ["experienced", "early", "changer"] as const
export type Profile = (typeof PROFILES)[number]

type Section = "summary" | "experience" | "education" | "projects" | "skills" | "certifications" | "languages"

export const PROFILE_INFO: Record<Profile, { label: string; description: string; order: Section[]; weights: Record<Section, number> }> = {
  experienced: {
    label: "Experienced",
    description: "Work history leads. Experience carries the most weight.",
    order: ["summary", "experience", "skills", "projects", "education", "certifications", "languages"],
    weights: { experience: 40, skills: 15, summary: 10, education: 10, projects: 10, certifications: 5, languages: 5 },
  },
  early: {
    label: "Student / graduate",
    description: "Education and projects lead. Internships count as experience.",
    order: ["summary", "education", "projects", "experience", "skills", "certifications", "languages"],
    weights: { education: 25, projects: 25, experience: 15, skills: 15, summary: 10, certifications: 5, languages: 5 },
  },
  changer: {
    label: "Career change",
    description: "Transferable skills and projects up front.",
    order: ["summary", "skills", "projects", "experience", "education", "certifications", "languages"],
    weights: { experience: 25, skills: 20, projects: 20, summary: 15, education: 10, certifications: 10, languages: 5 },
  },
}
const SECTIONS = Object.keys(PROFILE_INFO.experienced.weights) as Section[]

const DEFAULTS = {
  template: "classic",
  font: "arial",
  fontSize: 10,
  spacing: "normal",
  margins: "normal",
  paper: "a4",
  accent: "#1E3A8A",
  dateStyle: "short",
  profile: "experienced",
} as const

const keys = <T extends object>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]]

export const DesignSchema = z
  .object({
    template: z.enum(TEMPLATES).catch(DEFAULTS.template),
    font: z.enum(FONT_IDS).catch(DEFAULTS.font),
    fontSize: z
      .number()
      .catch(DEFAULTS.fontSize)
      .transform((n) => Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, Math.round(n / FONT_SIZE.step) * FONT_SIZE.step))),
    spacing: z.enum(keys(SPACINGS)).catch(DEFAULTS.spacing),
    margins: z.enum(keys(MARGINS)).catch(DEFAULTS.margins),
    paper: z.enum(keys(PAPERS)).catch(DEFAULTS.paper),
    accent: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .catch(DEFAULTS.accent),
    dateStyle: z.enum(DATE_STYLES).catch(DEFAULTS.dateStyle),
    profile: z.enum(PROFILES).catch(DEFAULTS.profile),
    /** Sections left out of this CV. Their content is kept, just not printed or scored. */
    hidden: z
      .array(z.string())
      .catch(() => [])
      .transform((keys) => [...new Set(keys)].filter((k): k is Section => (SECTIONS as string[]).includes(k))),
    /** Custom section titles, keyed by section. Empty or missing = the standard title. */
    headings: z.record(z.string(), z.string().catch("")).catch(() => ({})),
  })
  .catch(() => defaultDesign())

export type Design = z.infer<typeof DesignSchema>

export function defaultDesign(): Design {
  return { ...DEFAULTS, headings: {}, hidden: [] }
}

// --- Page geometry (shared by the preview, the page counter and print) ---

export const MM_TO_PX = 96 / 25.4

export type PageGeometry = {
  widthMm: number
  heightMm: number
  padXMm: number
  padYMm: number
  widthPx: number
  /** Printable height of one page once the top and bottom padding are removed. */
  contentPerPagePx: number
  padYPx: number
}

export function pageGeometry(d: Pick<Design, "paper" | "margins">): PageGeometry {
  const paper = PAPERS[d.paper]
  const m = MARGINS[d.margins]
  return {
    widthMm: paper.widthMm,
    heightMm: paper.heightMm,
    padXMm: m.x,
    padYMm: m.y,
    widthPx: paper.widthMm * MM_TO_PX,
    contentPerPagePx: (paper.heightMm - 2 * m.y) * MM_TO_PX,
    padYPx: m.y * MM_TO_PX,
  }
}

/** How many pages a sheet of this height (measured on screen, padding included) will print on. */
export function pagesForHeight(heightPx: number, g: PageGeometry): number {
  const content = heightPx - 2 * g.padYPx
  return Math.max(1, Math.ceil(content / g.contentPerPagePx - 0.01))
}

/**
 * Ever-tighter versions of a design for "Fit to one page", least drastic
 * first: tighter spacing, then narrower margins, then smaller text (down to
 * 9 pt). The template, font and colour never change.
 */
export function shrinkSteps(d: Design): Design[] {
  const steps: Design[] = []
  let cur = d
  const push = (patch: Partial<Design>) => {
    cur = { ...cur, ...patch }
    steps.push(cur)
  }
  if (cur.spacing === "relaxed") push({ spacing: "normal" })
  if (cur.spacing === "normal") push({ spacing: "compact" })
  if (cur.margins === "wide") push({ margins: "normal" })
  if (cur.margins === "normal") push({ margins: "narrow" })
  while (cur.fontSize > FONT_SIZE.min) push({ fontSize: cur.fontSize - FONT_SIZE.step })
  return steps
}
