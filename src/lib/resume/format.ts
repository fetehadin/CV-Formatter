import type { YearMonth } from "./schema"

/** "Sep 2022", "2022", or "" */
export function formatYearMonth(d: YearMonth): string {
  if (!d.year) return ""
  return d.month ? `${d.month} ${d.year}` : d.year
}

/** "Sep 2022 – Present", "2018 – 2022", "2022", or "" */
export function formatRange(start: YearMonth, end: YearMonth, current: boolean): string {
  const from = formatYearMonth(start)
  const to = current ? "Present" : formatYearMonth(end)
  if (from && to) return `${from} – ${to}`
  return from || to
}

const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

/** Months since year 0, or null when the year is missing. Month defaults to Jan. */
export function toMonthNumber(d: YearMonth): number | null {
  if (!/^\d{4}$/.test(d.year)) return null
  return Number(d.year) * 12 + (MONTH_INDEX[d.month] ?? 0)
}

/** True when both dates are known and the end comes before the start. */
export function isEndBeforeStart(start: YearMonth, end: YearMonth, current: boolean): boolean {
  if (current) return false
  const a = toMonthNumber(start)
  const b = toMonthNumber(end)
  return a !== null && b !== null && b < a
}

/** Adds https:// when the user typed a bare domain. Returns "" for empty input. */
export function toHref(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^\/+/, "")}`
}

/** "https://www.linkedin.com/in/abebe/" -> "linkedin.com/in/abebe" (readable by people and ATS). */
export function displayUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
}

/** Drops empty lines and any bullet markers the user typed. */
export function cleanBullets(bullets: string[]): string[] {
  return bullets.map((b) => b.trim().replace(/^[-*•●]\s*/, "")).filter(Boolean)
}

/** "React, TypeScript,  Node.js" -> ["React", "TypeScript", "Node.js"] */
export function splitList(value: string): string[] {
  return value
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
