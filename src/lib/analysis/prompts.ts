import type { Resume } from "@/lib/resume/schema"
import type { Issue, Report } from "./analyze"
import { resumeToPlainText } from "./plaintext"

/**
 * Builds copy-ready prompts the user can paste into any AI chat (ChatGPT,
 * Claude, Gemini…). The prompt carries the CV text, what the offline checker
 * already found, and strict "don't invent facts" rules.
 */

export const LEVELS = ["Student / graduate", "Junior (0–2 years)", "Mid-level (3–5 years)", "Senior (6+ years)", "Career changer"] as const

export type ReviewPromptOptions = {
  targetRole?: string
  level?: string
  market?: string // where they are applying, e.g. "Ethiopia", "Remote (EU)"
  redactContact?: boolean
  maxIssues?: number
}

const GROUND_RULES = `## Ground rules
1. Never invent facts, numbers, employers, tools or results. If a stronger line needs a number I haven't given, write a placeholder like [X%] or [N users] and ask me for it.
2. Keep claims I can defend in an interview, and keep my voice.
3. Quote the exact line you're commenting on.
4. The layout is a fixed one-column, ATS-friendly template. Comment on content, not design.`

function formatIssues(issues: Issue[], max: number): string {
  if (issues.length === 0) return "Nothing. The automated check found no problems."
  const lines = issues.slice(0, max).map((i) => `- [${i.severity}] ${i.title}${i.quote ? ` — "${i.quote}"` : ""}`)
  if (issues.length > max) lines.push(`- …and ${issues.length - max} smaller tips.`)
  return lines.join("\n")
}

export function buildReviewPrompt(resume: Resume, report: Report, opts: ReviewPromptOptions = {}): string {
  const role = opts.targetRole?.trim()
  const context = [
    `- Target role: ${role || "not given. Infer the most likely role from the CV and state your assumption."}`,
    opts.level && `- Experience level: ${opts.level}`,
    opts.market?.trim() && `- Applying in: ${opts.market.trim()}. Follow that market's CV conventions.`,
    report.stats.pages && `- Current length: ${report.stats.pages} page${report.stats.pages > 1 ? "s" : ""}, ${report.stats.bullets} bullet points, ${report.stats.bulletsWithNumbers} of them with numbers.`,
  ]
    .filter(Boolean)
    .join("\n")

  return `You are an experienced recruiter and CV coach${role ? ` who hires for ${role} roles` : ""}. Review my CV and help me make it stronger.

## Context
${context}

${GROUND_RULES}

## What an automated check already found
${formatIssues(report.issues, opts.maxIssues ?? 15)}
Confirm or challenge these. Don't just repeat them.

## What I want back
1. **Verdict**: 2–3 sentences on how this CV comes across in a 7-second recruiter skim, and its biggest gap.
2. **Top 5 fixes**, highest impact first.
3. **Bullet rewrites**: a table with columns Original | Improved | Why. Include every bullet that can clearly improve. Use "action verb + what you did + measurable result".
4. **Summary rewrite**: one version under 60 words.
5. **Missing for the target role**: skills or keywords recruiters expect that my CV doesn't show. Mark each one "add only if true".
6. **Questions for me**: what you need to know (numbers, scope, tools) to make the weak lines stronger.

<cv>
${resumeToPlainText(resume, { redactContact: opts.redactContact ?? true })}
</cv>`
}

/** Chat apps that accept a pre-filled prompt in the URL. */
export const AI_CHATS = [
  { name: "ChatGPT", url: (q: string) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`, home: "https://chatgpt.com/" },
  { name: "Claude", url: (q: string) => `https://claude.ai/new?q=${encodeURIComponent(q)}`, home: "https://claude.ai/new" },
  { name: "Gemini", url: null, home: "https://gemini.google.com/app" },
] as const

/** Long URLs get cut off by browsers and servers; above this we open the app and rely on the clipboard. */
export const MAX_PREFILL_CHARS = 6000

export function chatLink(chat: (typeof AI_CHATS)[number], prompt: string): { href: string; prefilled: boolean } {
  if (chat.url && encodeURIComponent(prompt).length <= MAX_PREFILL_CHARS) return { href: chat.url(prompt), prefilled: true }
  return { href: chat.home, prefilled: false }
}

// --- Tailoring to one job ---

export type TailorPromptOptions = {
  redactContact?: boolean
  coverLetter?: boolean
}

type TailorJob = { company: string; title: string; description: string }
type TailorMatch = {
  score: number | null
  years: string | null
  keywords: { name: string; importance: string; found: boolean; where: string[] }[]
}

function keywordLines(match: TailorMatch): string {
  const missing = match.keywords.filter((k) => !k.found)
  const thin = match.keywords.filter((k) => k.found && k.where.every((w) => w === "skills"))
  const lines = [
    `- Keyword match: ${match.score ?? "n/a"}%${match.years ? `. The job asks for ${match.years}.` : ""}`,
    missing.length ? `- Not in my CV: ${missing.map((k) => `${k.name} (${k.importance})`).join(", ")}` : "- Every keyword the check found is already in my CV.",
  ]
  if (thin.length) lines.push(`- Listed in skills but never shown in my experience: ${thin.map((k) => k.name).join(", ")}`)
  return lines.join("\n")
}

/** A prompt that tailors the CV to one job description without inventing anything. */
export function buildTailorPrompt(resume: Resume, job: TailorJob, match: TailorMatch, opts: TailorPromptOptions = {}): string {
  const role = [job.title.trim(), job.company.trim() && `at ${job.company.trim()}`].filter(Boolean).join(" ")
  const asks = [
    "**Fit verdict**: 3 sentences. How well do I match, what are my strongest selling points for this job, and what is the biggest gap?",
    "**Keyword gaps**: for each missing keyword, ask me one yes/no question to check whether I have that experience. Don't assume.",
    "**Summary for this job**: rewrite my summary for this role (under 60 words), using only facts from my CV.",
    "**Bullet changes**: a table with columns Section | Original | Tailored | Why. Reword my existing bullets to use the job's language where it's true for me. Point out which bullets to move up, and which to cut because they don't help for this job.",
    "**Skills order**: my skills reordered so the ones this job cares about come first. Don't add any I haven't listed.",
  ]
  if (opts.coverLetter) asks.push("**Cover letter**: under 200 words, specific to this job, using only facts from my CV. Use [placeholders] for anything you'd need me to confirm.")

  return `You are an experienced recruiter helping me tailor my CV to one job${role ? `: ${role}` : ""}.

${GROUND_RULES}
5. Never add a skill, tool or keyword to my CV just because the job asks for it. If I lack it, say so and suggest how I can honestly address the gap.

## What an automated keyword check found
${keywordLines(match)}

## What I want back
${asks.map((a, i) => `${i + 1}. ${a}`).join("\n")}

<job_description>
${job.description.trim()}
</job_description>

<cv>
${resumeToPlainText(resume, { redactContact: opts.redactContact ?? true })}
</cv>`
}
