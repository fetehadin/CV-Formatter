import "./resume.css"
import { Fragment, type CSSProperties, type ReactNode } from "react"
import { FONTS, pageGeometry, PAPERS, SPACINGS, type Design } from "@/lib/resume/design"
import { cleanBullets, displayUrl, formatRange, formatYearMonth, splitList, toHref } from "@/lib/resume/format"
import { sectionTitle, type Resume, type SectionKey } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"

/**
 * The printable CV. One column, real text, standard headings and system
 * fonts, so applicant tracking systems (ATS) read it in the right order.
 *
 * The look comes from `resume.design`: the template is a `data-template`
 * variant in resume.css, and size, spacing and colour are CSS variables.
 * Sizes are in mm/pt so the screen preview and the printed PDF match.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="cv-section">
      <h2 className="cv-heading">
        <span>{title}</span>
      </h2>
      <div className="cv-entries">{children}</div>
    </section>
  )
}

function Bullets({ items }: { items: string[] }) {
  const clean = cleanBullets(items)
  if (clean.length === 0) return null
  return (
    <ul className="cv-bullets">
      {clean.map((line, i) => (
        // A real "•" character (not a CSS marker) so it exists in the PDF's text and ATS can spot bullets.
        <li key={i} className="cv-bullet">
          <span className="cv-dot">•</span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Title row with a right-aligned date, and an optional subtitle row.
 * The compact template puts the subtitle on the title row to save a line.
 */
function EntryHead({ title, date, subtitle, aside, inline }: { title: ReactNode; date?: string; subtitle?: ReactNode; aside?: string; inline: boolean }) {
  if (inline) {
    return (
      <div className="cv-entry-head cv-row">
        <span>
          <span className="cv-title">{title}</span>
          {subtitle && <span className="cv-sub">, {subtitle}</span>}
          {aside && <span className="cv-aside"> · {aside}</span>}
        </span>
        {date && <span className="cv-date">{date}</span>}
      </div>
    )
  }
  return (
    <div className="cv-entry-head">
      <div className="cv-row">
        <span className="cv-title">{title}</span>
        {date && <span className="cv-date">{date}</span>}
      </div>
      {(subtitle || aside) && (
        <div className="cv-row cv-sub">
          <span>{subtitle}</span>
          {aside && <span className="cv-aside">{aside}</span>}
        </div>
      )}
    </div>
  )
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={toHref(href)} className="cv-link">
      {children}
    </a>
  )
}

function join(parts: ReactNode[], sep = " | ") {
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && <span className="cv-sep">{sep}</span>}
      {p}
    </Fragment>
  ))
}

function renderSection(key: SectionKey, r: Resume): ReactNode {
  const { dateStyle, template } = r.design
  const inline = template === "compact"
  const range = (x: Resume["experience"][number] | Resume["education"][number] | Resume["projects"][number]) => formatRange(x.start, x.end, x.current, dateStyle)
  const title = sectionTitle(r, key)

  switch (key) {
    case "summary":
      return r.summary.trim() ? (
        <Section title={title}>
          <p className="cv-summary">{r.summary.trim()}</p>
        </Section>
      ) : null

    case "experience": {
      const items = r.experience.filter((x) => x.role || x.company)
      return items.length ? (
        <Section title={title}>
          {items.map((x) => {
            // Modern and compact lead with the job title; classic and elegant with the company.
            const roleFirst = template === "modern" || template === "compact"
            const [main, sub] = roleFirst ? [x.role || x.company, x.role ? x.company : ""] : [x.company || x.role, x.company ? x.role : ""]
            return (
              <div key={x.id}>
                <EntryHead inline={inline} title={main} date={range(x)} subtitle={sub} aside={x.location} />
                <Bullets items={x.bullets} />
              </div>
            )
          })}
        </Section>
      ) : null
    }

    case "education": {
      const items = r.education.filter((e) => e.school || e.degree)
      return items.length ? (
        <Section title={title}>
          {items.map((e) => (
            <div key={e.id}>
              <EntryHead inline={inline} title={e.school || e.degree} date={range(e)} subtitle={e.school ? e.degree : ""} aside={e.location} />
              <Bullets items={e.bullets} />
            </div>
          ))}
        </Section>
      ) : null
    }

    case "projects": {
      const items = r.projects.filter((p) => p.name)
      return items.length ? (
        <Section title={title}>
          {items.map((p) => (
            <div key={p.id}>
              <EntryHead
                inline={inline}
                title={
                  <>
                    {p.name}
                    {p.link && (
                      <span className="cv-normal">
                        {" | "}
                        <Link href={p.link}>{displayUrl(p.link)}</Link>
                      </span>
                    )}
                  </>
                }
                date={range(p)}
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
        <Section title={title}>
          <div className="cv-list">
            {groups.map((g) => (
              <p key={g.id}>
                {g.name.trim() && <span className="cv-title">{g.name.trim()}: </span>}
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
        <Section title={title}>
          <div className="cv-list">
            {items.map((c) => (
              <div key={c.id} className="cv-row cv-keep">
                <span>
                  <span className="cv-title">{c.name}</span>
                  {c.issuer && <>, {c.issuer}</>}
                  {c.link && (
                    <>
                      {" | "}
                      <Link href={c.link}>{displayUrl(c.link)}</Link>
                    </>
                  )}
                </span>
                <span className="cv-date">{formatYearMonth(c.date, dateStyle)}</span>
              </div>
            ))}
          </div>
        </Section>
      ) : null
    }

    case "languages": {
      const items = r.languages.filter((l) => l.language)
      return items.length ? (
        <Section title={title}>
          <p>{items.map((l) => (l.fluency ? `${l.language} (${l.fluency})` : l.language)).join(", ")}</p>
        </Section>
      ) : null
    }
  }
}

/** CSS variables for a design. */
function designVars(d: Design): CSSProperties {
  return {
    "--cv-font": FONTS[d.font].stack,
    "--cv-fs": `${d.fontSize}pt`,
    "--cv-space": SPACINGS[d.spacing],
    "--cv-accent": d.accent,
  } as CSSProperties
}

export function ResumeContent({ resume }: { resume: Resume }) {
  const b = resume.basics
  const line1 = [b.location, b.phone, b.email && <Link key="e" href={`mailto:${b.email}`}>{b.email}</Link>].filter(Boolean)
  const line2 = [b.linkedin, b.github, b.website].filter(Boolean).map((url) => (
    <Link key={url} href={url}>
      {displayUrl(url)}
    </Link>
  ))
  // Modern and compact fit every contact detail on one line.
  const oneLine = resume.design.template === "modern" || resume.design.template === "compact"

  return (
    <div className="cv" data-template={resume.design.template} style={designVars(resume.design)}>
      <header className="cv-header">
        <h1 className="cv-name">{b.name || "Your Name"}</h1>
        {b.headline && <p className="cv-headline">{b.headline}</p>}
        {oneLine ? (
          line1.length + line2.length > 0 && <p className="cv-contact">{join([...line1, ...line2])}</p>
        ) : (
          <>
            {line1.length > 0 && <p className="cv-contact">{join(line1)}</p>}
            {line2.length > 0 && <p>{join(line2)}</p>}
          </>
        )}
      </header>
      {resume.sectionOrder.map((key) => (
        <Fragment key={key}>{renderSection(key, resume)}</Fragment>
      ))}
    </div>
  )
}

/**
 * One sheet of paper. On screen it has a fixed width; in print the browser
 * paginates it, and `box-decoration-break: clone` (resume.css) repeats the
 * top and bottom padding on every page.
 */
export function ResumePage({ resume, className, style }: { resume: Resume; className?: string; style?: CSSProperties }) {
  const g = pageGeometry(resume.design)
  return (
    <div
      className={cn("cv-page bg-white", className)}
      style={{ width: `${g.widthMm}mm`, minHeight: `${g.heightMm}mm`, padding: `${g.padYMm}mm ${g.padXMm}mm`, ...style }}
    >
      <ResumeContent resume={resume} />
    </div>
  )
}

/** The `@page` rule for the CV's paper size. Rendered inside the print-only copy. */
export function PrintPageStyle({ resume }: { resume: Resume }) {
  return <style>{`@page { size: ${PAPERS[resume.design.paper].css} portrait; margin: 0; }`}</style>
}
