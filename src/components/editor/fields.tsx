import { useId, type ReactNode } from "react"
import { ImproveBullets } from "@/components/ai/AiAssist"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { isEndBeforeStart } from "@/lib/resume/format"
import { MONTHS, type YearMonth } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"

export function FieldShell({ id, label, hint, error, className, children }: {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type TextFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "text" | "email" | "tel" | "url"
  autoComplete?: string
  hint?: ReactNode
  className?: string
}

export function TextField({ label, value, onChange, placeholder, type = "text", autoComplete, hint, className }: TextFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  )
}

export function TextAreaField({ label, value, onChange, placeholder, hint, rows = 4 }: Omit<TextFieldProps, "type" | "autoComplete" | "className"> & { rows?: number }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint}>
      <Textarea id={id} value={value} rows={rows} placeholder={placeholder} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.value)} />
    </FieldShell>
  )
}

/**
 * One bullet per line. Empty lines are kept while editing (so pressing Enter
 * works) and dropped when the CV is rendered.
 */
export function BulletsField({ label = "Bullet points", value, onChange, placeholder, ai }: {
  label?: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  /** When set, shows "Improve with AI" for these bullets. */
  ai?: { title: string; current: boolean }
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint="One point per line. Start with a strong verb and add a number where you can.">
      <Textarea
        id={id}
        rows={4}
        value={value.join("\n")}
        placeholder={placeholder}
        aria-describedby={`${id}-hint`}
        onChange={(e) => onChange(e.target.value.split("\n"))}
      />
      {ai && <ImproveBullets entry={{ ...ai, bullets: value }} onReplace={(index, text) => onChange(value.map((b, i) => (i === index ? text : b)))} />}
    </FieldShell>
  )
}

function MonthYear({ label, value, onChange, disabled }: { label: string; value: YearMonth; onChange: (v: YearMonth) => void; disabled?: boolean }) {
  const id = useId()
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="flex gap-2">
        <NativeSelect
          className="w-24 shrink-0"
          aria-label={`${label} month`}
          value={value.month}
          onChange={(e) => onChange({ ...value, month: e.target.value })}
        >
          <NativeSelectOption value="">Month</NativeSelectOption>
          {MONTHS.map((m) => (
            <NativeSelectOption key={m} value={m}>
              {m}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Input
          id={id}
          aria-label={`${label} year`}
          inputMode="numeric"
          placeholder="YYYY"
          maxLength={4}
          className="w-20"
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
        />
      </div>
    </fieldset>
  )
}

export function DateRangeField({ start, end, current, onChange, currentLabel = "I'm still here" }: {
  start: YearMonth
  end: YearMonth
  current: boolean
  onChange: (patch: { start?: YearMonth; end?: YearMonth; current?: boolean }) => void
  currentLabel?: string
}) {
  const switchId = useId()
  const backwards = isEndBeforeStart(start, end, current)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <MonthYear label="Start" value={start} onChange={(v) => onChange({ start: v })} />
        <MonthYear label="End" value={end} onChange={(v) => onChange({ end: v })} disabled={current} />
        <div className="flex h-8 items-center gap-2">
          <Switch id={switchId} checked={current} onCheckedChange={(checked) => onChange({ current: checked })} />
          <Label htmlFor={switchId} className="text-sm font-normal">
            {currentLabel}
          </Label>
        </div>
      </div>
      {backwards && (
        <p role="alert" className="text-xs text-destructive">
          The end date is before the start date.
        </p>
      )}
    </div>
  )
}

export function SingleDateField({ label, value, onChange }: { label: string; value: YearMonth; onChange: (v: YearMonth) => void }) {
  return <MonthYear label={label} value={value} onChange={onChange} />
}
