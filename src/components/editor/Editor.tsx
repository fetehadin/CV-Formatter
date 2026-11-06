import { useEffect, useId, useState, type ReactNode } from "react"
import { EyeOff } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { DragHandle, draggingClass, SortableList, useSortableRow } from "@/components/ui/sortable"
import { moveSectionTo, setSectionHidden } from "@/lib/resume/edit"
import { formatRange } from "@/lib/resume/format"
import { cn } from "@/lib/utils"
import { SECTION_LABELS, visibleSections, type Basics, type Resume, type SectionKey } from "@/lib/resume/schema"
import { DraftSummary } from "@/components/ai/AiAssist"
import { useEditorNav } from "@/state/editor-nav"
import { useWorkspace } from "@/state/workspace"
import { EntryList } from "./EntryList"
import { BulletsField, DateRangeField, SingleDateField, TextAreaField, TextField } from "./fields"

const FLUENCY = ["Native", "Fluent", "Professional", "Intermediate", "Basic"]

function Row({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

function PersonalFields() {
  const { resume, updateResume } = useWorkspace()
  const b = resume.basics
  const set = (key: keyof Basics) => (value: string) => updateResume((r) => ({ ...r, basics: { ...r.basics, [key]: value } }))
  return (
    <div className="flex flex-col gap-4">
      <Row>
        <TextField label="Full name" value={b.name} onChange={set("name")} placeholder="Fetehadin Negash" autoComplete="name" />
        <TextField label="Headline (optional)" value={b.headline} onChange={set("headline")} placeholder="Frontend Engineer" />
      </Row>
      <Row>
        <TextField label="Email" type="email" value={b.email} onChange={set("email")} placeholder="you@example.com" autoComplete="email" />
        <TextField label="Phone" type="tel" value={b.phone} onChange={set("phone")} placeholder="+251 911 000000" autoComplete="tel" />
      </Row>
      <TextField label="Location" value={b.location} onChange={set("location")} placeholder="Addis Ababa, Ethiopia" hint="City and country is enough. Never your full address." />
      <Row>
        <TextField label="LinkedIn" type="url" value={b.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/username" />
        <TextField label="GitHub" type="url" value={b.github} onChange={set("github")} placeholder="github.com/username" />
      </Row>
      <TextField label="Website or portfolio" type="url" value={b.website} onChange={set("website")} placeholder="yourname.dev" />
    </div>
  )
}

function SectionFields({ section }: { section: SectionKey }) {
  const { resume, updateResume } = useWorkspace()

  switch (section) {
    case "summary":
      return (
        <div className="flex flex-col gap-2">
          <TextAreaField
            label="Professional summary"
            rows={5}
            value={resume.summary}
            onChange={(summary) => updateResume((r) => ({ ...r, summary }))}
            placeholder="Frontend engineer with 3 years building React apps for fintech. Cut page load time by 45% at…"
            hint="2–4 sentences: who you are, your strongest skills, and one result."
          />
          <DraftSummary onUse={(summary) => updateResume((r) => ({ ...r, summary }))} />
        </div>
      )

    case "experience":
      return (
        <EntryList section="experience" noun="job" titleOf={(x) => x.role || x.company} subtitleOf={(x) => [x.role && x.company, formatRange(x.start, x.end, x.current)].filter(Boolean).join(" · ")}>
          {(x, update) => (
            <>
              <Row>
                <TextField label="Job title" value={x.role} onChange={(role) => update({ role })} placeholder="Frontend Engineer" />
                <TextField label="Company" value={x.company} onChange={(company) => update({ company })} placeholder="Chapa" />
              </Row>
              <TextField label="Location (optional)" value={x.location} onChange={(location) => update({ location })} placeholder="Addis Ababa or Remote" />
              <DateRangeField start={x.start} end={x.end} current={x.current} onChange={update} currentLabel="I work here now" />
              <BulletsField ai={{ title: [x.role, x.company].filter(Boolean).join(" at "), current: x.current }} value={x.bullets} onChange={(bullets) => update({ bullets })} placeholder={"Built the merchant dashboard in React and TypeScript\nCut page load time by 45% with code-splitting"} />
            </>
          )}
        </EntryList>
      )

    case "education":
      return (
        <EntryList section="education" noun="school" titleOf={(e) => e.school || e.degree} subtitleOf={(e) => [e.school && e.degree, formatRange(e.start, e.end, e.current)].filter(Boolean).join(" · ")}>
          {(e, update) => (
            <>
              <Row>
                <TextField label="School" value={e.school} onChange={(school) => update({ school })} placeholder="Addis Ababa University" />
                <TextField label="Degree or program" value={e.degree} onChange={(degree) => update({ degree })} placeholder="B.Sc. Software Engineering" />
              </Row>
              <TextField label="Location (optional)" value={e.location} onChange={(location) => update({ location })} />
              <DateRangeField start={e.start} end={e.end} current={e.current} onChange={update} currentLabel="I study here now" />
              <BulletsField label="Highlights (optional)" value={e.bullets} onChange={(bullets) => update({ bullets })} placeholder={"GPA 3.7/4.0\nThesis: offline-first clinic records app"} />
            </>
          )}
        </EntryList>
      )

    case "projects":
      return (
        <EntryList section="projects" noun="project" titleOf={(p) => p.name} subtitleOf={(p) => p.tech}>
          {(p, update) => (
            <>
              <Row>
                <TextField label="Project name" value={p.name} onChange={(name) => update({ name })} placeholder="Clinic Records" />
                <TextField label="Link (optional)" type="url" value={p.link} onChange={(link) => update({ link })} placeholder="github.com/you/clinic-records" />
              </Row>
              <TextField label="Tech used" value={p.tech} onChange={(tech) => update({ tech })} placeholder="React, IndexedDB, Node.js" hint="Comma-separated." />
              <DateRangeField start={p.start} end={p.end} current={p.current} onChange={update} currentLabel="Ongoing" />
              <BulletsField ai={{ title: p.name, current: p.current }} value={p.bullets} onChange={(bullets) => update({ bullets })} placeholder={"Built an offline-first app used by 3 clinics\nSynced 10k records with zero data loss"} />
            </>
          )}
        </EntryList>
      )

    case "skills":
      return (
        <EntryList section="skills" noun="skill group" titleOf={(g) => g.name || g.items} subtitleOf={(g) => (g.name ? g.items : "")}>
          {(g, update) => (
            <>
              <TextField label="Group name (optional)" value={g.name} onChange={(name) => update({ name })} placeholder="Languages" hint="e.g. Languages, Frameworks, Tools. Leave empty for a single list." />
              <TextAreaField label="Skills" rows={2} value={g.items} onChange={(items) => update({ items })} placeholder="TypeScript, Python, SQL" hint="Comma-separated. Printed as plain text so ATS can read it." />
            </>
          )}
        </EntryList>
      )

    case "certifications":
      return (
        <EntryList section="certifications" noun="certification" titleOf={(c) => c.name} subtitleOf={(c) => c.issuer}>
          {(c, update) => (
            <>
              <Row>
                <TextField label="Name" value={c.name} onChange={(name) => update({ name })} placeholder="AWS Certified Cloud Practitioner" />
                <TextField label="Issuer" value={c.issuer} onChange={(issuer) => update({ issuer })} placeholder="Amazon Web Services" />
              </Row>
              <Row>
                <SingleDateField label="Date" value={c.date} onChange={(date) => update({ date })} />
                <TextField label="Credential link (optional)" type="url" value={c.link} onChange={(link) => update({ link })} />
              </Row>
            </>
          )}
        </EntryList>
      )

    case "languages":
      return (
        <EntryList section="languages" noun="language" titleOf={(l) => l.language} subtitleOf={(l) => l.fluency}>
          {(l, update) => <LanguageFields language={l.language} fluency={l.fluency} onChange={update} />}
        </EntryList>
      )
  }
}

function LanguageFields({ language, fluency, onChange }: { language: string; fluency: string; onChange: (p: { language?: string; fluency?: string }) => void }) {
  const id = useId()
  return (
    <Row>
      <TextField label="Language" value={language} onChange={(v) => onChange({ language: v })} placeholder="Amharic" />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          Level
        </Label>
        <NativeSelect id={id} className="w-full" value={fluency} onChange={(e) => onChange({ fluency: e.target.value })}>
          <NativeSelectOption value="">Choose…</NativeSelectOption>
          {FLUENCY.map((f) => (
            <NativeSelectOption key={f} value={f}>
              {f}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    </Row>
  )
}

function count(r: Resume, key: SectionKey): number {
  if (key === "summary") return r.summary.trim() ? 1 : 0
  return r[key].length
}

/** One CV section in the editor: drag it by the grip to reorder, or take it off this CV. */
function SectionCard({ section }: { section: SectionKey }) {
  const { resume, updateResume } = useWorkspace()
  const row = useSortableRow(section)
  const n = count(resume, section)
  const label = SECTION_LABELS[section]
  return (
    <AccordionItem ref={row.ref} style={row.style} id={`section-${section}`} value={section} className={cn("scroll-mt-4 rounded-xl border bg-card pr-4 pl-1.5", row.isDragging && draggingClass)}>
      <div className="flex items-center gap-1">
        <DragHandle handle={row.handle} label={label} />
        <div className="min-w-0 flex-1">
          <AccordionTrigger className="items-center py-4 text-base font-semibold hover:no-underline">
            <span className="flex items-center gap-2">
              {label}
              {n > 0 && section !== "summary" && (
                <Badge variant="secondary" className="tabular-nums">
                  {n}
                </Badge>
              )}
            </span>
          </AccordionTrigger>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${label} from this CV`} title="Remove from this CV (your text is kept)" onClick={() => updateResume((r) => setSectionHidden(r, section, true))}>
          <EyeOff />
        </Button>
      </div>
      <AccordionContent className="pb-5 pl-2.5">
        <SectionFields section={section} />
      </AccordionContent>
    </AccordionItem>
  )
}

export function Editor() {
  const { resume, updateResume } = useWorkspace()
  const order = visibleSections(resume)
  const hidden = resume.sectionOrder.filter((k) => resume.design.hidden.includes(k))
  const { request, goTo } = useEditorNav()
  const [openSections, setOpenSections] = useState<string[]>(["personal"])

  // A panel asked to show a section: open it, and scroll to it unless an entry will scroll itself.
  useEffect(() => {
    if (!request || request.section === "design") return
    const key = request.section === "basics" ? "personal" : request.section
    setOpenSections((prev) => (prev.includes(key) ? prev : [...prev, key]))
    if (!request.itemId) {
      requestAnimationFrame(() => document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
  }, [request])

  return (
    <Accordion multiple value={openSections} onValueChange={(v) => setOpenSections(v as string[])} className="gap-3">
      <AccordionItem id="section-personal" value="personal" className="scroll-mt-4 rounded-xl border bg-card px-4">
        <AccordionTrigger className="items-center py-4 text-base font-semibold hover:no-underline">Personal details</AccordionTrigger>
        <AccordionContent className="pb-5">
          <PersonalFields />
        </AccordionContent>
      </AccordionItem>

      <SortableList ids={order} label={(k) => SECTION_LABELS[k]} onMove={(key, over) => updateResume((r) => moveSectionTo(r, key, over))}>
        {order.map((key) => (
          <SectionCard key={key} section={key} />
        ))}
      </SortableList>
      {hidden.length > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          Not on this CV: {hidden.map((k) => SECTION_LABELS[k]).join(", ")}.{" "}
          <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => goTo({ section: "design" })}>
            Add sections in Design
          </button>
        </p>
      )}
    </Accordion>
  )
}
