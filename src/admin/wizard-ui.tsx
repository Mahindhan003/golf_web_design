import type { ReactNode } from 'react'
import { fieldClass } from '../components'

/*
 * Building blocks for long create/edit flows (tournament, course, organiser):
 * a step header, a section rail, one section card at a time and the review page.
 * See .claude/skills/golf-ux-design (section 3, "Long create/edit flows").
 */

export type SectionState = 'idle' | 'valid' | 'error'

export interface WizardStep {
  key: string
  label: string
  sections: { key: string; title: string; state: SectionState }[]
}

/* ───────── Layout ───────── */

/** "A · Essentials — B · Setup — C · Review" with the active step in lime */
export function StepHeader({ steps, active, onSelect }: { steps: { key: string; label: string; done?: boolean }[]; active: string; onSelect: (key: string) => void }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 mb-6" aria-label="Steps">
      {steps.map((s, i) => {
        const on = s.key === active
        return (
          <li key={s.key} className="flex items-center gap-2">
            {i > 0 && <span className="w-6 lg:w-10 h-px bg-black/10" aria-hidden />}
            <button type="button" onClick={() => onSelect(s.key)} aria-current={on ? 'step' : undefined}
              className={`h-10 pl-1.5 pr-4 rounded-full flex items-center gap-2 text-[13px] font-bold font-display transition-colors ${
                on ? 'bg-ink text-white' : 'bg-white text-gray-600 shadow-card hover:text-ink'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] ${
                on ? 'bg-lime-400 text-ink' : s.done ? 'bg-pine-600 text-white' : 'bg-canvas text-gray-500'}`}>
                {s.done && !on ? '✓' : String.fromCharCode(65 + i)}
              </span>
              {s.label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/** Section list for the active step: a sticky rail on wide screens, a dropdown on narrow ones */
export function SectionRail({ sections, active, onSelect }: { sections: WizardStep['sections']; active: string; onSelect: (key: string) => void }) {
  const mark = (state: SectionState, on: boolean) =>
    state === 'error' ? <span className="w-2 h-2 rounded-full bg-rose-500" aria-label="Has errors" />
      : state === 'valid' ? <span className={`text-[12px] font-bold ${on ? 'text-lime-400' : 'text-pine-600'}`} aria-label="Complete">✓</span>
      : <span className="w-2 h-2 rounded-full bg-black/10" aria-hidden />
  return (
    <>
      <nav className="hidden lg:block sticky top-6 self-start w-[240px] flex-shrink-0" aria-label="Sections">
        <ul className="bg-white rounded-3xl shadow-card p-2 space-y-0.5">
          {sections.map(s => {
            const on = s.key === active
            return (
              <li key={s.key}>
                <button type="button" onClick={() => onSelect(s.key)} aria-current={on ? 'true' : undefined}
                  className={`w-full h-11 px-3.5 rounded-2xl flex items-center justify-between gap-2 text-left text-[14px] font-semibold font-display transition-colors ${
                    on ? 'bg-ink text-white' : 'text-gray-600 hover:bg-canvas hover:text-ink'}`}>
                  <span className="truncate">{s.title}</span>
                  {mark(s.state, on)}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      <label className="lg:hidden block w-full">
        <span className="sr-only">Section</span>
        <select value={active} onChange={e => onSelect(e.target.value)} className={fieldClass(false, true)}>
          {sections.map(s => <option key={s.key} value={s.key}>{s.title}{s.state === 'error' ? ' — needs attention' : s.state === 'valid' ? ' ✓' : ''}</option>)}
        </select>
      </label>
    </>
  )
}

/** The active section: title, one-line purpose, then its fields */
export function SectionCard({ title, subtitle, children, aside }: { title: string; subtitle?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="bg-white rounded-3xl shadow-card p-5 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] text-ink font-extrabold font-display tracking-tight">{title}</h2>
          {subtitle && <p className="text-[13px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {aside}
      </div>
      <div className="space-y-6 mt-6">{children}</div>
    </section>
  )
}

/** A titled group of fields inside a section card */
export function FieldGroup({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[14px] font-bold font-display text-ink">{title}</h3>
        {hint && <p className="text-[12px] text-gray-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

/* ───────── Inputs ───────── */

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="text-[13px] font-semibold text-gray-600 font-display">
      {label}{required && <span className="text-rose-500"> *</span>}
    </span>
  )
}

export function FieldError({ error, hint }: { error?: string; hint?: string }) {
  if (error) return <p className="text-xs text-red-500 font-medium" role="alert">{error}</p>
  if (hint) return <p className="text-[12px] text-gray-500">{hint}</p>
  return null
}

export interface OptionCard {
  value: string
  title: string
  description?: string
  tag?: string
  disabled?: boolean
}

/** 2–4 options that need an explanation: big selectable cards (ink ring + lime check) */
export function OptionCards({ label, required, options, value, onChange, error, hint, columns = 2, disabled }: {
  label?: string; required?: boolean; options: OptionCard[]; value: string; onChange: (v: string) => void
  error?: string; hint?: string; columns?: 2 | 3; disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={label}>
      {label && <FieldLabel label={label} required={required} />}
      <div className={`grid gap-3 ${columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {options.map(o => {
          const on = o.value === value
          const off = disabled || o.disabled
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} disabled={off} onClick={() => onChange(o.value)}
              className={`relative text-left rounded-2xl p-4 transition-all ${
                on ? 'bg-white ring-2 ring-ink shadow-card' : 'bg-canvas hover:bg-white hover:ring-1 hover:ring-black/10'
              } ${off && !on ? 'opacity-50' : ''}`}>
              <span className="flex items-center gap-2 pr-7">
                <span className="text-[15px] font-bold font-display text-ink">{o.title}</span>
                {o.tag && <span className="h-5 px-2 rounded-full bg-lime-300/50 text-[10px] font-bold font-display text-pine-800 inline-flex items-center uppercase tracking-wide">{o.tag}</span>}
              </span>
              {o.description && <span className="block text-[12px] text-gray-500 mt-1 leading-relaxed">{o.description}</span>}
              <span className={`absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                on ? 'bg-lime-400 text-ink' : 'ring-1 ring-black/15'}`}>{on ? '✓' : ''}</span>
            </button>
          )
        })}
      </div>
      <FieldError error={error} hint={hint} />
    </div>
  )
}

/** 2–6 short options: a segmented pill control */
export function Segmented<T extends string | number>({ label, required, options, value, onChange, error, hint, disabled }: {
  label?: string; required?: boolean; options: { value: T; label: string; disabled?: boolean }[]; value: T; onChange: (v: T) => void
  error?: string; hint?: string; disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <FieldLabel label={label} required={required} />}
      <div className="inline-flex flex-wrap self-start bg-canvas rounded-full p-1 gap-1" role="radiogroup" aria-label={label}>
        {options.map(o => {
          const on = o.value === value
          return (
            <button key={String(o.value)} type="button" role="radio" aria-checked={on} disabled={disabled || o.disabled}
              onClick={() => onChange(o.value)}
              className={`h-9 px-4 rounded-full text-[13px] font-bold font-display transition-colors disabled:opacity-40 ${
                on ? 'bg-ink text-white' : 'text-gray-600 hover:text-ink'}`}>
              {o.label}
            </button>
          )
        })}
      </div>
      <FieldError error={error} hint={hint} />
    </div>
  )
}

/** Date, time or date + time input in the shared field style */
export function DateTimeInput({ label, required, type, value, onChange, error, hint, min, max, disabled }: {
  label: string; required?: boolean; type: 'date' | 'time' | 'datetime-local'; value: string; onChange: (v: string) => void
  error?: string; hint?: string; min?: string; max?: string; disabled?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel label={label} required={required} />
      <input type={type} value={value} min={min} max={max} disabled={disabled} onChange={e => onChange(e.target.value)}
        className={`${fieldClass(!!error)} ${value ? '' : 'text-gray-400'}`} />
      <FieldError error={error} hint={hint} />
    </label>
  )
}

/** Number input with − / + buttons */
export function Stepper({ label, required, value, onChange, min, max, step = 1, suffix, error, hint, disabled }: {
  label: string; required?: boolean; value: number; onChange: (v: number) => void; min: number; max: number; step?: number
  suffix?: string; error?: string; hint?: string; disabled?: boolean
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel label={label} required={required} />
      <div className="inline-flex items-center self-start bg-canvas rounded-full p-1">
        <button type="button" disabled={disabled || value <= min} onClick={() => onChange(clamp(value - step))} aria-label={`Decrease ${label}`}
          className="w-10 h-10 rounded-full bg-white shadow-card text-[18px] font-bold text-ink disabled:opacity-40">−</button>
        <span className="min-w-[72px] text-center font-display font-extrabold text-[17px] text-ink" aria-live="polite">{value}{suffix ? ` ${suffix}` : ''}</span>
        <button type="button" disabled={disabled || value >= max} onClick={() => onChange(clamp(value + step))} aria-label={`Increase ${label}`}
          className="w-10 h-10 rounded-full bg-white shadow-card text-[18px] font-bold text-ink disabled:opacity-40">+</button>
      </div>
      <FieldError error={error} hint={hint} />
    </div>
  )
}

/** Min – max pair under one label (handicap range, age range) */
export function RangeInput({ label, min, max, onMin, onMax, step, placeholder = 'Any', disabled }: {
  label: string; min: number | ''; max: number | ''; onMin: (v: string) => void; onMax: (v: string) => void
  step?: string; placeholder?: string; disabled?: boolean
}) {
  const box = 'w-full min-w-[64px] h-[52px] rounded-2xl bg-canvas px-2 text-[15px] text-center text-ink placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-pine-100/60'
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel label={label} />
      <div className="flex items-center gap-1.5">
        <input type="number" step={step} value={min} placeholder={placeholder} disabled={disabled} aria-label={`${label} from`} onChange={e => onMin(e.target.value)} className={box} />
        <span className="text-gray-400" aria-hidden>–</span>
        <input type="number" step={step} value={max} placeholder={placeholder} disabled={disabled} aria-label={`${label} to`} onChange={e => onMax(e.target.value)} className={box} />
      </div>
    </div>
  )
}

/** One-line note: info (lime), warning (amber) or error (rose) */
export function Callout({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'error'; children: ReactNode }) {
  const tones = {
    info: 'bg-lime-300/30 text-pine-800',
    warning: 'bg-amber-50 text-amber-800',
    error: 'bg-rose-50 text-rose-700',
  }
  return <div className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${tones[tone]}`}>{children}</div>
}

/* ───────── Review ───────── */

export interface ReviewIssue {
  section: string
  sectionTitle: string
  message: string
}

/** Errors block publishing; warnings don't */
const ACTION_WORDS = { publish: ['Ready to publish', 'publishing'], save: ['Ready to save', 'saving'], activate: ['Ready to activate', 'activating'] } as const

export function ValidationPanel({ errors, warnings, onFix, action = 'publish' }: { errors: ReviewIssue[]; warnings: ReviewIssue[]; onFix: (section: string) => void; action?: keyof typeof ACTION_WORDS }) {
  const ready = errors.length === 0
  return (
    <aside className="bg-white rounded-3xl shadow-card p-5 space-y-4" aria-label="Validation">
      <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${ready ? 'bg-lime-300/40' : 'bg-rose-50'}`}>
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold ${ready ? 'bg-ink text-lime-400' : 'bg-rose-500 text-white'}`}>
          {ready ? '✓' : errors.length}
        </span>
        <p className={`text-[14px] font-bold font-display ${ready ? 'text-ink' : 'text-rose-700'}`}>
          {ready ? ACTION_WORDS[action][0] : `${errors.length} to fix before ${ACTION_WORDS[action][1]}`}
        </p>
      </div>
      {[{ list: errors, tone: 'text-rose-600', dot: 'bg-rose-500' }, { list: warnings, tone: 'text-amber-700', dot: 'bg-amber-400' }].map(({ list, tone, dot }, i) =>
        list.length > 0 && (
          <div key={i}>
            <p className={`text-[12px] font-bold font-display uppercase tracking-wide mb-2 ${tone}`}>{i === 0 ? 'Errors' : `${list.length} warning${list.length > 1 ? 's' : ''}`}</p>
            <ul className="space-y-2">
              {list.map((x, k) => (
                <li key={k} className="flex items-start gap-2.5 text-[13px]">
                  <span className={`w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0 ${dot}`} aria-hidden />
                  <span className="flex-1 text-ink leading-snug">{x.message}<span className="block text-[11px] text-gray-400">{x.sectionTitle}</span></span>
                  <button type="button" onClick={() => onFix(x.section)} className="text-[12px] font-bold font-display text-pine-600 hover:underline underline-offset-4 flex-shrink-0">Fix</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </aside>
  )
}

/** Summary card on the review page: label / value rows and an Edit link */
export function SummaryCard({ title, rows, onEdit }: { title: string; rows: [string, ReactNode][]; onEdit: () => void }) {
  return (
    <section className="bg-white rounded-3xl shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[16px] font-extrabold font-display text-ink tracking-tight">{title}</h3>
        <button type="button" onClick={onEdit} className="h-8 px-3.5 rounded-full bg-canvas text-[12px] font-bold font-display text-ink hover:bg-gray-200">Edit</button>
      </div>
      <dl className="divide-y divide-black/[0.05]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2 text-[13px]">
            <dt className="text-gray-500">{k}</dt>
            <dd className="font-semibold text-ink text-right">{v || <span className="text-gray-300">—</span>}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
