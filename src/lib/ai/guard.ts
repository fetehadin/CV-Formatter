import { DICTIONARY } from "@/lib/tailor/dictionary"
import { aliasRegex } from "@/lib/tailor/match"

/**
 * The honesty check. AI rewrites are compared with what the user actually
 * wrote. Anything new that looks like a fact (a number, a skill or tool) is
 * flagged so the user can't accept an invented claim by accident.
 * It runs locally and doesn't trust the AI's own promises.
 */

export type GuardResult = {
  /** Numbers in the suggestion that aren't anywhere in the user's CV. */
  newNumbers: string[]
  /** Skills/tools in the suggestion that the CV never mentions. */
  newSkills: string[]
  /** [X%]-style gaps the user must fill in. */
  placeholders: string[]
  ok: boolean
}

// A number with an optional currency and unit: "45%", "$2k", "3x", "10+". Unit letters must stand alone ("400 merchants" is just 400).
const NUMBER = /(?:[$€£]\s?)?\d+(?:[.,]\d+)*(?:\s?(?:%|percent\b)|[kmx](?![a-z])|\+)?/gi
const PLACEHOLDER = /\[[^\]]{1,40}\]/g

function normalizeNumber(n: string): string {
  return n.toLowerCase().replace(/[\s,$€£+]/g, "").replace(/percent$/, "%").replace(/\.$/, "")
}

/** Digits only, so "45 %" in the source still covers "45%" in the suggestion. */
function digits(n: string): string {
  return n.replace(/[^\d.]/g, "").replace(/\.$/, "")
}

export function guardSuggestion(suggestion: string, source: string): GuardResult {
  const withoutPlaceholders = suggestion.replace(PLACEHOLDER, " ")
  const placeholders = suggestion.match(PLACEHOLDER) ?? []

  const sourceDigits = new Set((source.match(NUMBER) ?? []).map((n) => digits(normalizeNumber(n))).filter(Boolean))
  const newNumbers = [...new Set((withoutPlaceholders.match(NUMBER) ?? []).map((n) => n.trim()))].filter((n) => {
    const d = digits(normalizeNumber(n))
    return d !== "" && !sourceDigits.has(d)
  })

  const newSkills = DICTIONARY.filter((entry) => {
    const regexes = entry.aliases.map(aliasRegex)
    const inSuggestion = regexes.some((re) => ((re.lastIndex = 0), re.test(withoutPlaceholders)))
    if (!inSuggestion) return false
    return !regexes.some((re) => ((re.lastIndex = 0), re.test(source)))
  }).map((e) => e.name)

  return { newNumbers, newSkills, placeholders, ok: newNumbers.length === 0 && newSkills.length === 0 }
}
