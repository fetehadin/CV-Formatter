import { z } from "zod"
import { resumeToPlainText } from "@/lib/analysis/plaintext"
import { cleanBullets } from "@/lib/resume/format"
import type { Resume } from "@/lib/resume/schema"
import type { JobTarget } from "@/lib/resume/workspace"

/**
 * The AI tasks the app runs itself. Each one has a fixed prompt, a JSON shape
 * the answer must match, and the source text the honesty guard compares with.
 * Contact details are never sent.
 */

const HONESTY = `Rules you must follow:
- Use only facts present in the CV below. Never add numbers, percentages, tools, technologies, employers, titles, team sizes or outcomes that are not stated there.
- When a number would make a line stronger but isn't given, write a placeholder in square brackets, like [X%], [N users] or [time saved], so the person can fill in the real figure.
- Plain text only: no emoji, no markdown.`

function jobContext(job: JobTarget | null): string {
  if (!job?.description.trim()) return ""
  return `\n\nThe person is applying for: ${[job.title, job.company].filter(Boolean).join(" at ") || "a job"}.
Prefer the job's wording where it truthfully describes the same thing, but never claim a skill the CV doesn't show.
<job_description>
${job.description.trim().slice(0, 6000)}
</job_description>`
}

/** Everything the user wrote, used by the guard to spot invented facts. */
export function sourceText(resume: Resume): string {
  return resumeToPlainText(resume, { redactContact: true })
}

// --- Improve one bullet ---

export const BulletResultSchema = z.object({
  variants: z.array(z.object({ text: z.string(), focus: z.string().catch("") })).min(1),
  question: z.string().catch(""),
})
export type BulletResult = z.infer<typeof BulletResultSchema>

export const BULLET_JSON_SCHEMA = {
  type: "object",
  properties: {
    variants: {
      type: "array",
      description: "Exactly 3 rewrites, each taking a different angle.",
      items: {
        type: "object",
        properties: {
          text: { type: "string", description: "The rewritten bullet, one sentence, under 30 words." },
          focus: { type: "string", description: "2-5 words naming the angle, e.g. 'Leads with the result'." },
        },
        required: ["text", "focus"],
        additionalProperties: false,
      },
    },
    question: { type: "string", description: "One short question whose answer would make this bullet stronger." },
  },
  required: ["variants", "question"],
  additionalProperties: false,
}

export function bulletAsk(resume: Resume, entry: { title: string; current: boolean; bullets: string[] }, bullet: string, job: JobTarget | null) {
  const others = cleanBullets(entry.bullets).filter((b) => b !== bullet.trim())
  return {
    system: `You are an expert CV editor who helps people describe their real work clearly and convincingly.

${HONESTY}
- Start each rewrite with a strong action verb (${entry.current ? "present tense, since this is a current role" : "past tense"}).
- Pattern: what they did + how + the result or scale.
- Each rewrite is one sentence under 30 words. Make the three rewrites genuinely different.`,
    prompt: `<cv>
${sourceText(resume)}
</cv>

Entry: ${entry.title || "(untitled)"}
${others.length ? `Other bullets in this entry (don't repeat them):\n${others.map((b) => `- ${b}`).join("\n")}\n` : ""}
Bullet to rewrite:
"${bullet.trim()}"${jobContext(job)}`,
    schema: BULLET_JSON_SCHEMA,
  }
}

// --- Draft a summary ---

export const SummaryResultSchema = z.object({
  summary: z.string(),
  question: z.string().catch(""),
})
export type SummaryResult = z.infer<typeof SummaryResultSchema>

export const SUMMARY_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "A professional summary of 2-4 sentences, under 70 words, no pronouns." },
    question: { type: "string", description: "One short question whose answer would make the summary stronger." },
  },
  required: ["summary", "question"],
  additionalProperties: false,
}

export function summaryAsk(resume: Resume, job: JobTarget | null) {
  return {
    system: `You are an expert CV editor. You write the short professional summary at the top of a CV.

${HONESTY}
- 2-4 sentences, under 70 words. No "I", "my" or "me".
- Open with who they are professionally (role + experience level), then their strongest relevant skills, then one concrete result taken from the CV.`,
    prompt: `<cv>
${sourceText(resume)}
</cv>${jobContext(job)}

Write the summary.`,
    schema: SUMMARY_JSON_SCHEMA,
  }
}

/** System prompt used when running the Check or Tailor prompts in the app. */
export const REVIEW_SYSTEM = `You are an honest, specific CV coach. Follow the user's ground rules exactly, above all: never invent facts. Use short headings and plain text tables where asked.`
