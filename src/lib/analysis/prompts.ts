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
