import { useId, type ReactNode } from "react"
import { Check, Minimize2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { TextField } from "@/components/editor/fields"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select"
import { ACCENTS, defaultDesign, FONT_SIZE, FONTS, PAPERS, TEMPLATE_INFO, TEMPLATES, type DateStyle, type Design, type FontId, type Margins, type Paper, type Spacing } from "@/lib/resume/design"
import { formatYearMonth } from "@/lib/resume/format"
import { SECTION_LABELS, type SectionKey } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/state/workspace"
import { fitToOnePage } from "./fit"

function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

/** A row of mutually exclusive buttons (radio group). */
function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <Field label={label}>
      <div role="radiogroup" aria-label={label} className="flex rounded-lg border p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-7 flex-1 rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  )
}

const SAMPLE_DATE = { month: "Sep", year: "2022" }
const FONT_SIZES = Array.from({ length: (FONT_SIZE.max - FONT_SIZE.min) / FONT_SIZE.step + 1 }, (_, i) => FONT_SIZE.min + i * FONT_SIZE.step)
const FONT_GROUPS = ["Sans-serif", "Serif"] as const

/** Template, type, spacing, paper and colour for the active CV. Changes show in the preview right away. */
export function DesignPanel() {
  const { resume, updateResume, updateWorkspace } = useWorkspace()
  const d = resume.design
  const fontId = useId()
  const sizeId = useId()
  const dateId = useId()

  const set = (patch: Partial<Design>) => updateResume((r) => ({ ...r, design: { ...r.design, ...patch } }))
  /** Replaces the whole design and offers Undo. */
  const replace = (next: Design, message: string, description?: string) => {
    const previous = d
    set(next)
    toast.success(message, { description, action: { label: "Undo", onClick: () => set(previous) } })
  }

  const fit = () => {
    const result = fitToOnePage(resume)
    if (result === "fits") toast("Already fits on one page")
    else if (result === null)
      toast.error("Still longer than one page", {
        description: "Even the tightest layout needs a second page. Cut older roles or weaker bullets. Check shows which ones have no numbers.",
      })
    else replace(result, "Fitted to one page", `${result.fontSize} pt text, ${result.spacing} spacing, ${result.margins} margins.`)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground" id={`${fontId}-tpl`}>
          Template
        </span>
        <div role="radiogroup" aria-labelledby={`${fontId}-tpl`} className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {TEMPLATES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={d.template === t}
              onClick={() => set({ template: t })}
              className={cn(
                "flex flex-col gap-0.5 rounded-lg border p-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                d.template === t ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
              )}
            >
              <span className="flex items-center gap-1 text-sm font-medium">
                {TEMPLATE_INFO[t].label}
                {d.template === t && <Check className="size-3.5" aria-hidden />}
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground">{TEMPLATE_INFO[t].description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Font" htmlFor={fontId}>
          <NativeSelect id={fontId} className="w-full" value={d.font} onChange={(e) => set({ font: e.target.value as FontId })}>
            {FONT_GROUPS.map((kind) => (
              <NativeSelectOptGroup key={kind} label={kind}>
                {(Object.keys(FONTS) as FontId[])
                  .filter((f) => FONTS[f].kind === kind)
                  .map((f) => (
                    <NativeSelectOption key={f} value={f}>
                      {FONTS[f].label}
                    </NativeSelectOption>
                  ))}
              </NativeSelectOptGroup>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Text size" htmlFor={sizeId}>
          <NativeSelect id={sizeId} className="w-full" value={String(d.fontSize)} onChange={(e) => set({ fontSize: Number(e.target.value) })}>
            {FONT_SIZES.map((s) => (
              <NativeSelectOption key={s} value={String(s)}>
                {s} pt{s === 10 ? " (default)" : ""}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Dates" htmlFor={dateId}>
          <NativeSelect id={dateId} className="w-full" value={d.dateStyle} onChange={(e) => set({ dateStyle: e.target.value as DateStyle })}>
            {(["short", "long", "numeric"] as const).map((s) => (
              <NativeSelectOption key={s} value={s}>
                {formatYearMonth(SAMPLE_DATE, s)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Segmented<Spacing>
          label="Spacing"
          value={d.spacing}
          onChange={(spacing) => set({ spacing })}
          options={[
            { value: "compact", label: "Tight" },
            { value: "normal", label: "Normal" },
            { value: "relaxed", label: "Airy" },
          ]}
        />
        <Segmented<Margins>
          label="Margins"
          value={d.margins}
          onChange={(margins) => set({ margins })}
          options={[
            { value: "narrow", label: "Narrow" },
            { value: "normal", label: "Normal" },
            { value: "wide", label: "Wide" },
          ]}
        />
        <Segmented<Paper>
          label="Paper"
          value={d.paper}
          onChange={(paper) => set({ paper })}
          options={(Object.keys(PAPERS) as Paper[]).map((p) => ({ value: p, label: PAPERS[p].label }))}
        />
      </div>

      <Field label="Colour">
        <div className="flex flex-wrap items-center gap-2">
          {ACCENTS.map((a) => {
            const active = d.accent.toLowerCase() === a.value.toLowerCase()
            return (
              <button
                key={a.value}
                type="button"
                aria-label={a.label}
                aria-pressed={active}
                title={a.label}
                onClick={() => set({ accent: a.value })}
                className={cn("size-7 rounded-full ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring", active && "ring-2 ring-foreground")}
                style={{ background: a.value }}
              />
            )
          })}
          <label className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
            <input type="color" value={d.accent} onChange={(e) => set({ accent: e.target.value })} className="size-5 cursor-pointer rounded-full border-0 bg-transparent p-0" />
            Custom
          </label>
        </div>
      </Field>

      <details className="group rounded-lg border px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium select-none">Section titles</summary>
        <p className="mt-1 text-xs text-muted-foreground">Rename a section if your field expects it, e.g. "Experience" or "Profile". Standard titles are safest for ATS; Check warns about unusual ones.</p>
        <div className="mt-3 grid gap-3 pb-1 sm:grid-cols-2">
          {resume.sectionOrder.map((key: SectionKey) => (
            <TextField
              key={key}
              label={SECTION_LABELS[key]}
              value={d.headings[key] ?? ""}
              placeholder={SECTION_LABELS[key]}
              onChange={(title) => set({ headings: { ...d.headings, [key]: title } })}
            />
          ))}
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={fit}>
          <Minimize2 /> Fit to one page
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const design = d
            updateWorkspace((ws) => ({ ...ws, documents: ws.documents.map((doc) => ({ ...doc, resume: { ...doc.resume, design: structuredClone(design) } })) }))
            toast.success("Design used on all your CVs")
          }}
        >
          Use on all CVs
        </Button>
        <Button size="sm" variant="ghost" onClick={() => replace(defaultDesign(), "Design reset")}>
          <RotateCcw /> Reset
        </Button>
      </div>
    </div>
  )
}
