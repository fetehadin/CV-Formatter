import { z } from "zod"

/**
 * The single source of truth for what a CV looks like.
 *
 * Every field uses `.catch()` so that `parseResume()` never throws: missing or
 * wrongly-typed values fall back to a safe default. That makes it safe to feed
 * in old saves, hand-edited JSON or imported files.
 */

export const newId = () => crypto.randomUUID()

const text = z.string().catch("")
const flag = z.boolean().catch(false)
const lines = z.array(z.string()).catch(() => [])

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const

export const YearMonthSchema = z
  .object({
    month: text, // "" or one of MONTHS
    year: text, // "" or 4 digits
  })
  .catch(() => ({ month: "", year: "" }))

const dated = {
  start: YearMonthSchema,
  end: YearMonthSchema,
  current: flag, // true = "Present"; `end` is ignored
}

export const ExperienceSchema = z.object({
  id: z.string().catch(newId),
  role: text,
  company: text,
  location: text,
  ...dated,
  bullets: lines,
})

export const EducationSchema = z.object({
  id: z.string().catch(newId),
  school: text,
  degree: text,
  location: text,
  ...dated,
  bullets: lines,
})

export const ProjectSchema = z.object({
  id: z.string().catch(newId),
  name: text,
  link: text,
  tech: text, // comma-separated, shown after the name
  ...dated,
  bullets: lines,
})

export const CertificationSchema = z.object({
  id: z.string().catch(newId),
  name: text,
  issuer: text,
  date: YearMonthSchema,
  link: text,
})

export const LanguageSchema = z.object({
  id: z.string().catch(newId),
  language: text,
  fluency: text,
})

export const SkillGroupSchema = z.object({
  id: z.string().catch(newId),
  name: text, // e.g. "Languages"; may be empty
  items: text, // comma-separated
})

export const SECTION_KEYS = [
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "languages",
] as const
export type SectionKey = (typeof SECTION_KEYS)[number]

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Summary",
  experience: "Work Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  languages: "Languages",
}

/** Keeps known keys once each, in the given order, then appends any missing ones. */
export function normalizeSectionOrder(order: unknown): SectionKey[] {
  const known = new Set<string>(SECTION_KEYS)
  const seen = new Set<SectionKey>()
  const result: SectionKey[] = []
  if (Array.isArray(order)) {
    for (const key of order) {
      if (typeof key === "string" && known.has(key) && !seen.has(key as SectionKey)) {
        seen.add(key as SectionKey)
        result.push(key as SectionKey)
      }
    }
  }
  for (const key of SECTION_KEYS) if (!seen.has(key)) result.push(key)
  return result
}

const items = <T extends z.ZodType>(schema: T) => z.array(schema).catch(() => [])

export const ResumeSchema = z.object({
  basics: z
    .object({
      name: text,
      headline: text, // e.g. "Frontend Engineer"
      email: text,
      phone: text,
      location: text,
      linkedin: text,
      github: text,
      website: text,
    })
    .catch(() => ({ name: "", headline: "", email: "", phone: "", location: "", linkedin: "", github: "", website: "" })),
  summary: text,
  experience: items(ExperienceSchema),
  education: items(EducationSchema),
  projects: items(ProjectSchema),
  skills: items(SkillGroupSchema),
  certifications: items(CertificationSchema),
  languages: items(LanguageSchema),
  sectionOrder: z.array(z.string()).catch(() => []).transform(normalizeSectionOrder),
})

export type YearMonth = z.infer<typeof YearMonthSchema>
export type Experience = z.infer<typeof ExperienceSchema>
export type Education = z.infer<typeof EducationSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Certification = z.infer<typeof CertificationSchema>
export type Language = z.infer<typeof LanguageSchema>
export type SkillGroup = z.infer<typeof SkillGroupSchema>
export type Resume = z.infer<typeof ResumeSchema>
export type Basics = Resume["basics"]

/** Never throws. Anything unusable becomes an empty value. */
export function parseResume(input: unknown): Resume {
  return ResumeSchema.parse(input ?? {})
}

const emptyRange = () => ({ start: { month: "", year: "" }, end: { month: "", year: "" }, current: false })

export const blank = {
  experience: (): Experience => ({ id: newId(), role: "", company: "", location: "", ...emptyRange(), bullets: [] }),
  education: (): Education => ({ id: newId(), school: "", degree: "", location: "", ...emptyRange(), bullets: [] }),
  projects: (): Project => ({ id: newId(), name: "", link: "", tech: "", ...emptyRange(), bullets: [] }),
  certifications: (): Certification => ({ id: newId(), name: "", issuer: "", date: { month: "", year: "" }, link: "" }),
  languages: (): Language => ({ id: newId(), language: "", fluency: "" }),
  skills: (): SkillGroup => ({ id: newId(), name: "", items: "" }),
}

export function emptyResume(): Resume {
  return parseResume({ experience: [blank.experience()], education: [blank.education()] })
}

/** Sections that hold a list of entries, and their item types. */
export type ListSectionMap = {
  experience: Experience
  education: Education
  projects: Project
  certifications: Certification
  languages: Language
  skills: SkillGroup
}
export type ListSection = keyof ListSectionMap
