import { Fragment, type CSSProperties, type ReactNode } from "react"
import { cleanBullets, displayUrl, formatRange, formatYearMonth, splitList, toHref } from "@/lib/resume/format"
import type { Resume, SectionKey } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"

/**
 * The printable CV. One column, real text, standard headings and fonts, so
 * applicant tracking systems (ATS) read it in the right order.
 *
 * Sizes are in mm/pt so the screen preview and the printed PDF match.
 */

export const PAGE_WIDTH_MM = 210
export const PAGE_HEIGHT_MM = 297
export const MM_TO_PX = 96 / 25.4
export const PAGE_WIDTH_PX = PAGE_WIDTH_MM * MM_TO_PX
export const PAGE_HEIGHT_PX = PAGE_HEIGHT_MM * MM_TO_PX
/** Top and bottom padding of the sheet; matches `.cv-page` in App.css. */
export const PAGE_PADDING_Y_MM = 12
/** Printable height of one page once top and bottom padding are removed. */
export const CONTENT_PER_PAGE_PX = (PAGE_HEIGHT_MM - 2 * PAGE_PADDING_Y_MM) * MM_TO_PX

/** How many A4 pages a sheet of this height (measured on screen) will print on. */
export function pagesForHeight(heightPx: number): number {
  const content = heightPx - 2 * PAGE_PADDING_Y_MM * MM_TO_PX
  return Math.max(1, Math.ceil(content / CONTENT_PER_PAGE_PX - 0.01))
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-[3.5mm]">
      <h2 className="mb-[1.5mm] break-after-avoid border-b border-[#9ca3af] pb-[0.5mm] text-[11pt] font-bold tracking-wide text-[#1E3A8A] uppercase">
        {title}
      </h2>
      <div className="flex flex-col gap-[2.5mm]">{children}</div>
    </section>
  )
}

function Bullets({ items }: { items: string[] }) {
  const clean = cleanBullets(items)
  if (clean.length === 0) return null
  return (
    <ul className="mt-[0.8mm] flex flex-col gap-[0.4mm] pl-[4.5mm]">
      {clean.map((line, i) => (
        <li key={i} className="list-disc break-inside-avoid marker:text-[8pt]">
          {line}
        </li>
      ))}
    </ul>
  )
}

/** Title row with a right-aligned date, and an optional italic subtitle row. */
function EntryHead({ title, date, subtitle, aside }: { title: ReactNode; date?: string; subtitle?: ReactNode; aside?: string }) {
  return (
    <div className="break-inside-avoid break-after-avoid">
      <div className="flex items-baseline justify-between gap-4 font-bold">
        <span>{title}</span>
        {date && <span className="shrink-0 font-normal italic">{date}</span>}
      </div>
      {(subtitle || aside) && (
        <div className="flex items-baseline justify-between gap-4 italic">
          <span>{subtitle}</span>
          {aside && <span className="shrink-0">{aside}</span>}
        </div>
      )}
    </div>
  )
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={toHref(href)} className="text-[#1E3A8A] no-underline">
      {children}
    </a>
  )
}

function join(parts: ReactNode[], sep = " | ") {
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && <span className="text-[#4b5563]">{sep}</span>}
      {p}
    </Fragment>
  ))
}

function renderSection(key: SectionKey, r: Resume): ReactNode {
  switch (key) {
    case "summary":
      return r.summary.trim() ? (
        <Section title="Summary">
          <p className="text-justify whitespace-pre-line">{r.summary.trim()}</p>
        </Section>
      ) : null

    case "experience": {
      const items = r.experience.filter((x) => x.role || x.company)
      return items.length ? (
        <Section title="Work Experience">
          {items.map((x) => (
            <div key={x.id}>
              <EntryHead title={x.company || x.role} date={formatRange(x.start, x.end, x.current)} subtitle={x.company ? x.role : ""} aside={x.location} />
              <Bullets items={x.bullets} />
            </div>
          ))}
        </Section>
      ) : null
    }

    case "education": {
      const items = r.education.filter((e) => e.school || e.degree)
      return items.length ? (
        <Section title="Education">
          {items.map((e) => (
            <div key={e.id}>
              <EntryHead title={e.school || e.degree} date={formatRange(e.start, e.end, e.current)} subtitle={e.school ? e.degree : ""} aside={e.location} />
              <Bullets items={e.bullets} />
            </div>
          ))}
        </Section>
      ) : null
    }

    case "projects": {
      const items = r.projects.filter((p) => p.name)
      return items.length ? (
        <Section title="Projects">
          {items.map((p) => (
            <div key={p.id}>
              <EntryHead
                title={
                  <>
                    {p.name}
                    {p.link && (
                      <span className="font-normal">
                        {" | "}
                        <Link href={p.link}>{displayUrl(p.link)}</Link>
                      </span>
                    )}
                  </>
                }
                date={formatRange(p.start, p.end, p.current)}
                subtitle={splitList(p.tech).join(", ")}
              />
              <Bullets items={p.bullets} />
            </div>
          ))}
        </Section>
      ) : null
    }

    case "skills": {
      const groups = r.skills.map((g) => ({ ...g, list: splitList(g.items) })).filter((g) => g.list.length)
      return groups.length ? (
        <Section title="Skills">
          <div className="flex flex-col gap-[0.6mm]">
            {groups.map((g) => (
              <p key={g.id}>
                {g.name.trim() && <span className="font-bold">{g.name.trim()}: </span>}
                {g.list.join(", ")}
              </p>
            ))}
          </div>
        </Section>
      ) : null
    }

    case "certifications": {
      const items = r.certifications.filter((c) => c.name)
      return items.length ? (
        <Section title="Certifications">
          <div className="flex flex-col gap-[0.6mm]">
            {items.map((c) => (
              <div key={c.id} className="flex items-baseline justify-between gap-4 break-inside-avoid">
                <span>
                  <span className="font-bold">{c.name}</span>
                  {c.issuer && <>, {c.issuer}</>}
                  {c.link && (
                    <>
                      {" | "}
                      <Link href={c.link}>{displayUrl(c.link)}</Link>
                    </>
                  )}
                </span>
                <span className="shrink-0 italic">{formatYearMonth(c.date)}</span>
              </div>
            ))}
          </div>
        </Section>
      ) : null
    }

    case "languages": {
      const items = r.languages.filter((l) => l.language)
      return items.length ? (
        <Section title="Languages">
          <p>{items.map((l) => (l.fluency ? `${l.language} (${l.fluency})` : l.language)).join(", ")}</p>
        </Section>
      ) : null
    }
  }
}

export function ResumeContent({ resume }: { resume: Resume }) {
  const b = resume.basics
  const line1 = [b.location, b.phone, b.email && <Link key="e" href={`mailto:${b.email}`}>{b.email}</Link>].filter(Boolean)
  const line2 = [b.linkedin, b.github, b.website].filter(Boolean).map((url) => (
    <Link key={url} href={url}>
      {displayUrl(url)}
    </Link>
  ))

  return (
    <div className="font-[Arial,Helvetica,sans-serif] text-[10pt] leading-[1.35] text-[#111827]">
      <header className="mb-[4mm] flex flex-col items-center text-center">
        <h1 className="text-[20pt] leading-tight font-bold tracking-wide text-[#1E3A8A] uppercase">{b.name || "Your Name"}</h1>
        {b.headline && <p className="mt-[0.5mm] text-[11pt]">{b.headline}</p>}
        {line1.length > 0 && <p className="mt-[1mm]">{join(line1)}</p>}
        {line2.length > 0 && <p>{join(line2)}</p>}
      </header>
      {resume.sectionOrder.map((key) => (
        <Fragment key={key}>{renderSection(key, resume)}</Fragment>
      ))}
    </div>
  )
}

/** An A4 sheet. On screen it has a fixed size; in print the browser paginates it. */
export function ResumePage({ resume, className, style }: { resume: Resume; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("cv-page bg-white", className)} style={style}>
      <ResumeContent resume={resume} />
    </div>
  )
}
