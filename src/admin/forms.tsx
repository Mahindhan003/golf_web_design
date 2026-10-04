import { useState, type FormEvent, type ReactNode, type TextareaHTMLAttributes } from 'react'
import type {
  Course, Division, Eligibility, HoleData, Official, TeeSet, Prize, RegistrationWindow, ScoringRules, TeeSheetSettings,
  Tournament, TournamentFees, TournamentFormat, TournamentRound, TournamentStatus,
} from '../types'
import { Input, SelectField, ChoiceChips, fieldClass } from '../components'
import { MOCK_COURSES } from '../data'
import {
  STATUS_OPTIONS, GOLF_PHOTOS, newId, formatDateRange, deriveRegistrationStatus,
  venueFieldsFromCourse, generateHoles, scorecardTotals,
} from '../store'
import {
  DEFAULT_ELIGIBILITY, DEFAULT_SCORING, DEFAULT_TEE_SHEET, defaultDivisions, defaultRegistration, defaultRounds,
  summaryFields, withTournamentDefaults, withCourseDefaults, defaultTeeSets, generateHoleMap,
} from '../golf'
import { TeeSetsSection, ContactFacilitiesSection, CourseStatusSection, HoleGuideSection, type CourseExtras } from './course-sections'
import {
  RoundsSection, ScoringSection, EligibilitySection, DivisionsSection, RegistrationSection, FeesSection,
  PrizesSection, TeeSheetSection, OfficialsSection,
} from './tournament-sections'

/*
 * Admin create/edit forms, shared verbatim by the mobile and web projects.
 * Layout uses container queries (@container / @md:) so the same form adapts to a
 * phone-width frame and to a wide desktop column.
 *
 * The parent renders the submit button with form={formId}, so each app can place
 * its own action bar.
 */

/* ───────── Small building blocks ───────── */

export function FormSection({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-3xl shadow-card p-4 @md:p-6">
      <h3 className="text-[16px] @md:text-[18px] text-ink font-bold font-display tracking-tight">{title}</h3>
      {subtitle && <p className="text-[13px] text-gray-500 mt-0.5">{subtitle}</p>}
      <div className="space-y-4 mt-4">{children}</div>
    </section>
  )
}

export function Textarea({ label, error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-gray-600 font-display">{label}</label>
      <textarea
        {...props}
        className={`${fieldClass(!!error)} h-auto min-h-[120px] py-3 leading-relaxed resize-y`}
      />
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
}

export function DateField({ label, value, onChange, error, min }: { label: string; value: string; onChange: (v: string) => void; error?: string; min?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-gray-600 font-display">{label}</label>
      <input type="date" value={value} min={min} onChange={e => onChange(e.target.value)} className={`${fieldClass(!!error)} ${value ? '' : 'text-gray-400'}`} />
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
}

function PhotoPicker({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="space-y-3">
      <div className="relative h-40 @md:h-52 rounded-2xl overflow-hidden bg-canvas flex items-center justify-center">
        {value
          ? <img src={value} alt="Selected photo" className="absolute inset-0 w-full h-full object-cover" />
          : <span className="text-[13px] text-gray-400 font-medium">No photo selected</span>}
      </div>
      <div className="grid grid-cols-4 @md:grid-cols-7 gap-2">
        {GOLF_PHOTOS.map(url => {
          const on = url === value
          return (
            <button
              key={url}
              type="button"
              onClick={() => onChange(url)}
              aria-label="Use this photo"
              aria-pressed={on}
              className={`relative aspect-[4/3] rounded-xl overflow-hidden transition-all ${on ? 'ring-[3px] ring-lime-500 ring-offset-2' : 'opacity-80 hover:opacity-100'}`}
            >
              <img src={url.replace('w=800&h=500', 'w=200&h=150')} alt="" className="w-full h-full object-cover" />
            </button>
          )
        })}
      </div>
      <Input label="…or paste an image link" placeholder="https://" value={value} onChange={e => onChange(e.target.value)} error={error} />
    </div>
  )
}

function has(v: string) { return v.trim().length > 0 }

/** On/off switch with a label and optional hint */
export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <span>
        <span className="block text-[14px] font-semibold text-ink font-display">{label}</span>
        {hint && <span className="block text-[12px] text-gray-500 mt-0.5">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${checked ? 'bg-ink' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px] bg-lime-400' : 'left-0.5'}`} />
      </button>
    </label>
  )
}

/** Small "+ Add" button for repeatable rows */
export function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="h-10 px-4 rounded-full bg-canvas text-ink text-[13px] font-bold font-display hover:bg-gray-200 inline-flex items-center gap-1.5">
      <span className="text-[16px] leading-none">+</span> {label}
    </button>
  )
}

/** Round remove button for repeatable rows */
export function RemoveRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="w-10 h-10 mt-[26px] rounded-full bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 flex-shrink-0 text-[18px] leading-none">×</button>
  )
}

/* ───────── Tournament form ───────── */

const FORMATS: TournamentFormat[] = ['Stroke Play', 'Stableford', 'Four-Ball', 'Scramble']

interface TournamentFormProps {
  formId: string
  initial?: Tournament
  onSave: (t: Tournament) => void
  /** View-only: every field is disabled */
  readOnly?: boolean
  /** Statuses this admin may choose (e.g. drafts only while an organisation is under review) */
  statusOptions?: typeof STATUS_OPTIONS
  /** Explains why the status list is limited */
  statusNote?: string
  /** Players registered so far (from the field, not typed in) */
  registered?: number
}

export function TournamentForm({ formId, initial, onSave, readOnly, statusOptions = STATUS_OPTIONS, statusNote, registered = 0 }: TournamentFormProps) {
  // Every structured field has a default, so new and old tournaments edit the same way
  const base = initial ? withTournamentDefaults(initial) : undefined
  const [name, setName]           = useState(base?.name ?? '')
  const [category, setCategory]   = useState(base?.category ?? '')
  const [format, setFormat]       = useState<string>(base?.format ?? '')
  const [status, setStatus]       = useState<string>(base?.status ?? statusOptions[0]?.value ?? 'draft')
  // Keep the current status selectable even if it's outside the allowed list
  const statusChoices = base && !statusOptions.some(o => o.value === base.status)
    ? [...STATUS_OPTIONS.filter(o => o.value === base.status), ...statusOptions]
    : statusOptions
  const [courseId, setCourseId]   = useState(base?.courseId ?? '')
  const [startDate, setStartDate] = useState(base?.startDate ?? '')
  const [endDate, setEndDate]     = useState(base?.endDate ?? base?.startDate ?? '')
  const [rounds, setRounds]       = useState<TournamentRound[]>(base?.rounds ?? defaultRounds(''))
  const [scoring, setScoring]     = useState<ScoringRules>(base?.scoring ?? DEFAULT_SCORING)
  const [eligibility, setElig]    = useState<Eligibility>(base?.eligibility ?? DEFAULT_ELIGIBILITY)
  const [divisions, setDivisions] = useState<Division[]>(base?.divisions ?? defaultDivisions())
  const [registration, setReg]    = useState<RegistrationWindow>(base?.registration ?? defaultRegistration(''))
  const [fees, setFees]           = useState<TournamentFees>(base?.fees ?? { currency: 'USD', amount: 0, perTeam: false, includes: ['Green fee'] })
  const [prizes, setPrizes]       = useState<Prize[]>(base?.prizes ?? [])
  const [teeSheet, setTeeSheet]   = useState<TeeSheetSettings>(base?.teeSheet ?? DEFAULT_TEE_SHEET)
  const [officials, setOfficials] = useState<Official[]>(base?.officials ?? [])
  const [contactEmail, setEmail]  = useState(base?.contactEmail ?? '')
  const [contactPhone, setPhone]  = useState(base?.contactPhone ?? '')
  const [maxPlayers, setMax]      = useState(String(base?.maxPlayers ?? ''))
  const [description, setDesc]    = useState(base?.description ?? '')
  const [localRules, setRules]    = useState(base?.localRules ?? '')
  const [imageUrl, setImageUrl]   = useState(base?.imageUrl ?? GOLF_PHOTOS[0])
  const [errors, setErrors]       = useState<Record<string, string>>({})

  const course = MOCK_COURSES.find(c => c.id === courseId)
  const clear = (f: string) => { if (errors[f]) setErrors(x => ({ ...x, [f]: '' })) }
  // Section edits clear the error list; validation runs again on save
  const touch = <T,>(set: (v: T) => void) => (v: T) => { set(v); if (Object.values(errors).some(Boolean)) setErrors({}) }

  function changeDates(start: string, end: string) {
    setStartDate(start)
    setEndDate(end)
    // Keep rounds on the event's days; regenerate when the count no longer fits
    const fresh = defaultRounds(start, end)
    setRounds(r => (r.length === fresh.length ? r.map((x, i) => ({ ...x, date: fresh[i].date })) : fresh))
    if (!base) setReg(defaultRegistration(start))
  }

  function changeCourse(id: string) {
    setCourseId(id)
    clear('courseId')
    // Point divisions at a tee set that exists on the new course
    const tees = MOCK_COURSES.find(c => c.id === id)?.teeSets ?? []
    setDivisions(ds => ds.map(d => (tees.some(t => t.id === d.teeSetId) ? d : { ...d, teeSetId: tees[1]?.id ?? tees[0]?.id ?? '' })))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!has(name)) e.name = 'Tournament name is required'
    if (!has(category)) e.category = 'Category is required'
    if (!format) e.format = 'Choose a format'
    if (!courseId) e.courseId = 'Choose a course'
    if (!startDate) e.startDate = 'Start date is required'
    if (endDate && startDate && endDate < startDate) e.endDate = "End date can't be before the start date"
    if (rounds.some(r => !r.date || r.date < startDate || r.date > (endDate || startDate))) e.rounds = 'Every round needs a date within the event dates'
    if (!(scoring.allowancePct >= 0 && scoring.allowancePct <= 100)) e.allowancePct = '0–100'
    if (!(scoring.maxHandicap >= -10 && scoring.maxHandicap <= 54)) e.maxHandicap = 'Between −10 and 54'
    if (scoring.cutAfterRound > 0 && !(scoring.cutSize > 0)) e.cutSize = 'How many make the cut?'
    if (eligibility.minHandicap !== undefined && eligibility.maxHandicap !== undefined && eligibility.minHandicap > eligibility.maxHandicap) e.eligibilityHandicap = 'Max must be at least the min'
    if (eligibility.minAge !== undefined && eligibility.maxAge !== undefined && eligibility.minAge > eligibility.maxAge) e.eligibilityAge = 'Max must be at least the min'
    if (divisions.some(d => !has(d.name) || d.minHandicap > d.maxHandicap || !d.teeSetId)) e.divisions = 'Each division needs a name, a valid handicap range and tees'
    const max = parseInt(maxPlayers, 10)
    if (!max || max < 1) e.maxPlayers = 'Enter the maximum number of players'
    else if (max < registered) e.maxPlayers = `${registered} are already registered`
    if (!registration.opensAt) e.opensAt = 'When does registration open?'
    if (!registration.closesAt) e.closesAt = 'When does registration close?'
    else if (registration.opensAt && registration.closesAt <= registration.opensAt) e.closesAt = 'Must be after it opens'
    else if (startDate && registration.closesAt.slice(0, 10) > startDate) e.closesAt = 'Must close by the first day'
    if (registration.withdrawBy && registration.closesAt && registration.withdrawBy > registration.closesAt) e.withdrawBy = 'Should be before registration closes'
    if (!(fees.amount >= 0)) e.amount = 'Enter the entry fee (0 for free)'
    if (fees.earlyBirdAmount !== undefined && !fees.earlyBirdUntil) e.earlyBirdUntil = 'When does the early-bird price end?'
    if (!teeSheet.firstTeeTime) e.firstTeeTime = 'Required'
    if (teeSheet.startType === 'tee-times' && !(teeSheet.intervalMinutes >= 5 && teeSheet.intervalMinutes <= 20)) e.intervalMinutes = '5–20 minutes'
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) e.contactEmail = 'Enter a valid email'
    if (!has(description)) e.description = 'Add a short description'
    if (!has(imageUrl)) e.imageUrl = 'Choose or paste a photo'
    return e
  }

  function submit(ev: FormEvent) {
    ev.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) {
      // Bring the first problem into view
      requestAnimationFrame(() => document.querySelector(`#${formId} .text-red-500`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    const s = status as TournamentStatus
    const structured: Tournament = {
      ...(base ?? ({} as Tournament)),
      id: base?.id ?? newId('t'),
      organizerId: base?.organizerId, // ownership never changes on edit
      name: name.trim(),
      category: category.trim(),
      format: format as TournamentFormat,
      status: s,
      registrationStatus: deriveRegistrationStatus(s, base?.registrationStatus),
      courseId,
      ...venueFieldsFromCourse(course!),
      startDate,
      endDate: endDate || startDate,
      dateRange: formatDateRange(startDate, endDate || startDate),
      maxPlayers: parseInt(maxPlayers, 10),
      players: registered,
      description: description.trim(),
      localRules: localRules.trim(),
      imageUrl: imageUrl.trim(),
      rounds, scoring, eligibility, divisions, registration, fees,
      prizes: prizes.filter(p => has(p.label) || has(p.value)),
      teeSheet,
      officials: officials.filter(o => has(o.name)),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      entryFee: '', prize: '', time: '',
    }
    onSave({ ...structured, ...summaryFields(structured) })
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="@container">
      {/* A disabled fieldset disables every input and button inside it */}
      <fieldset disabled={readOnly} className="space-y-4 @md:space-y-5 min-w-0">
      <FormSection title="Basics">
        <Input label="Tournament name" placeholder="e.g. Autumn Stableford Cup" value={name}
          onChange={e => { setName(e.target.value); clear('name') }} error={errors.name} />
        <div className="grid @md:grid-cols-2 gap-4">
          <Input label="Category" placeholder="e.g. Amateur Open Division" value={category}
            onChange={e => { setCategory(e.target.value); clear('category') }} error={errors.category} />
          <SelectField label="Status" value={status} onChange={setStatus} options={statusChoices} />
        </div>
        <p className="text-[12px] text-gray-500 -mt-2">
          {STATUS_OPTIONS.find(o => o.value === status)?.label} — {
            status === 'draft' ? 'only visible in the admin console, not to golfers.'
            : status === 'registration-open' ? 'golfers can register now.'
            : status === 'published' || status === 'upcoming' ? 'visible, registration not open yet.'
            : status === 'in-progress' ? 'live scoring and the leaderboard are on.'
            : status === 'cancelled' ? 'shown as cancelled; registration disabled.'
            : 'registration disabled.'}
        </p>
        {statusNote && <p className="text-[12px] font-semibold text-amber-700 bg-amber-50 rounded-xl px-3 py-2 -mt-1">{statusNote}</p>}
        <ChoiceChips label="Format" options={FORMATS} value={format}
          onChange={v => { setFormat(v as string); clear('format') }} error={errors.format} />
      </FormSection>

      <FormSection title="Venue & dates">
        <SelectField label="Course" placeholder="Select a course" value={courseId} onChange={changeCourse}
          options={MOCK_COURSES.map(c => ({ value: c.id, label: c.name }))} error={errors.courseId} />
        {course && <p className="text-[12px] text-gray-500 -mt-2">Venue and location fill in from {course.name} · {course.teeSets?.length ?? 0} tee sets · {course.holes} holes</p>}
        <div className="grid @md:grid-cols-2 gap-4">
          <DateField label="Start date" value={startDate} error={errors.startDate}
            onChange={v => { changeDates(v, !endDate || endDate < v ? v : endDate); clear('startDate') }} />
          <DateField label="End date" value={endDate} min={startDate} error={errors.endDate}
            onChange={v => { changeDates(startDate, v); clear('endDate') }} />
        </div>
        {startDate && <p className="text-[12px] text-gray-500 -mt-2">Shown to golfers as <span className="font-semibold text-ink">{formatDateRange(startDate, endDate || startDate)}</span></p>}
      </FormSection>

      <RoundsSection rounds={rounds} onChange={touch(setRounds)} startDate={startDate} endDate={endDate} error={errors.rounds} />
      <ScoringSection value={scoring} onChange={touch(setScoring)} rounds={rounds.length} format={format} errors={errors} />
      <EligibilitySection value={eligibility} onChange={touch(setElig)} errors={errors} />
      <DivisionsSection divisions={divisions} onChange={touch(setDivisions)} course={course} error={errors.divisions} />
      <RegistrationSection value={registration} onChange={touch(setReg)} maxPlayers={maxPlayers} onMaxPlayers={touch(setMax)} registered={registered} errors={errors} />
      <FeesSection value={fees} onChange={touch(setFees)} errors={errors} />
      <PrizesSection prizes={prizes} onChange={touch(setPrizes)} divisions={divisions} />
      <TeeSheetSection value={teeSheet} onChange={touch(setTeeSheet)} maxPlayers={parseInt(maxPlayers, 10) || 0} holeCount={course?.holes ?? 18} errors={errors} />
      <OfficialsSection officials={officials} onChange={touch(setOfficials)} email={contactEmail} phone={contactPhone} onEmail={touch(setEmail)} onPhone={touch(setPhone)} errors={errors} />

      <FormSection title="Details">
        <Textarea label="Description" placeholder="What makes this event special, who it's for, what's included…"
          value={description} onChange={e => { setDesc(e.target.value); clear('description') }} error={errors.description} />
        <Textarea label="Local rules (optional)" placeholder="One rule per line — preferred lies, drop zones, pace of play…"
          value={localRules} onChange={e => setRules(e.target.value)} style={{ minHeight: 100 }} />
      </FormSection>

      <FormSection title="Photo">
        <PhotoPicker value={imageUrl} onChange={v => { setImageUrl(v); clear('imageUrl') }} error={errors.imageUrl} />
      </FormSection>
      </fieldset>
    </form>
  )
}

/* ───────── Course form ───────── */

const COUNTRIES = ['United States', 'United Kingdom', 'Ireland', 'Canada', 'Australia', 'New Zealand', 'South Africa', 'Spain', 'Portugal', 'Japan']

interface CourseFormProps {
  formId: string
  initial?: Course
  onSave: (c: Course) => void
  /** View-only: every field is disabled */
  readOnly?: boolean
  /** Scorecard can be seen but not changed (no "Edit scorecard" permission) */
  scorecardLocked?: boolean
}

const isUrlish = (v: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(v.trim())

export function CourseForm({ formId, initial, onSave, readOnly, scorecardLocked }: CourseFormProps) {
  const base = initial ? withCourseDefaults(initial) : undefined
  const [name, setName]           = useState(base?.name ?? '')
  const [designer, setDesigner]   = useState(base?.designer ?? '')
  const [established, setEst]     = useState(base?.established === '—' ? '' : base?.established ?? '')
  const [description, setDesc]    = useState(base?.description ?? '')
  const [address, setAddress]     = useState(base?.address ?? '')
  const [city, setCity]           = useState(base?.city ?? '')
  const [region, setRegion]       = useState(base?.region ?? '')
  const [country, setCountry]     = useState(base?.country ?? 'United States')
  const [lat, setLat]             = useState(base?.geo ? String(base.geo.lat) : '')
  const [lng, setLng]             = useState(base?.geo ? String(base.geo.lng) : '')
  const [holeCount, setHoleCount] = useState<9 | 18>((base?.holes === 9 ? 9 : 18))
  const [holes, setHoles]         = useState<HoleData[]>(() => generateHoles(base?.holes === 9 ? 9 : 18, base?.holeData))
  const [womenDiffer, setWomen]   = useState(() => !!base?.holeData.some(h => h.parWomen !== undefined || h.handicapWomen !== undefined))
  const [teeSets, setTeeSets]     = useState<TeeSet[]>(() => base?.teeSets ?? defaultTeeSets(holes, 72, 125))
  // The scorecard shows one set of tees; its yards are the hole yards and its rating is the course rating
  const [scorecardTeeId, setScorecardTee] = useState(() => {
    const sets = base?.teeSets ?? []
    return sets.find(t => t.yards.every((y, i) => y === base?.holeData[i]?.yards))?.id ?? sets.find(t => t.id === 'tee-blue')?.id ?? sets[0]?.id ?? 'tee-blue'
  })
  const [extras, setExtras]       = useState<CourseExtras>({
    phone: base?.phone ?? '', email: base?.email ?? '', website: base?.website ?? '', bookingUrl: base?.bookingUrl ?? '',
    facilities: base?.facilities ?? [], dressCode: base?.dressCode ?? '', status: base?.status ?? 'open', statusNote: base?.statusNote ?? '',
  })
  const [imageUrl, setImageUrl]   = useState(base?.imageUrl ?? GOLF_PHOTOS[1])
  const [errors, setErrors]       = useState<Record<string, string>>({})

  const clear = (f: string) => { if (errors[f]) setErrors(x => ({ ...x, [f]: '' })) }
  const totals = scorecardTotals(holes)
  const scorecardTee = teeSets.find(t => t.id === scorecardTeeId) ?? teeSets[0]

  /** Tee yards arrays follow the hole count; new holes start from the scorecard yards */
  const fitTees = (sets: TeeSet[], hs: HoleData[]) => sets.map(t => ({ ...t, yards: hs.map((h, i) => t.yards[i] ?? h.yards) }))

  function changeHoleCount(n: 9 | 18) {
    const next = generateHoles(n, holes)
    setHoleCount(n)
    setHoles(next)
    setTeeSets(sets => fitTees(sets, next))
    clear('holes')
  }

  function setHole(i: number, field: 'par' | 'yards' | 'handicap' | 'parWomen' | 'handicapWomen', value: string) {
    const v = value === '' ? ('' as unknown as number) : Number(value)
    setHoles(h => h.map((x, j) => (j === i ? { ...x, [field]: v } : x)))
    // Scorecard yards are the scorecard tee's yards
    if (field === 'yards') setTeeSets(sets => sets.map(t => (t.id === scorecardTeeId ? { ...t, yards: t.yards.map((y, k) => (k === i ? v : y)) } : t)))
    clear('holes')
  }

  function changeTeeSets(sets: TeeSet[]) {
    setTeeSets(sets)
    const sc = sets.find(t => t.id === scorecardTeeId)
    if (sc) setHoles(h => h.map((x, i) => ({ ...x, yards: sc.yards[i] ?? x.yards })))
    clear('teeSets')
  }

  function changeScorecardTee(id: string) {
    setScorecardTee(id)
    const sc = teeSets.find(t => t.id === id)
    if (sc) setHoles(h => h.map((x, i) => ({ ...x, yards: sc.yards[i] ?? x.yards })))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!has(name)) e.name = 'Course name is required'
    if (!has(description)) e.description = 'Add a short description'
    if (!has(address)) e.address = 'Address is required'
    if (!has(city)) e.city = 'City is required'
    if (!has(region)) e.region = 'State / region is required'
    if (established && (!/^\d{4}$/.test(established) || Number(established) > new Date().getFullYear())) e.established = 'Use a 4-digit year, not in the future'
    if (lat || lng) {
      const la = Number(lat), lo = Number(lng)
      if (!lat || Number.isNaN(la) || la < -90 || la > 90) e.lat = 'Latitude −90 to 90'
      if (!lng || Number.isNaN(lo) || lo < -180 || lo > 180) e.lng = 'Longitude −180 to 180'
    }
    const badHole = holes.find(h => !(h.par >= 3 && h.par <= 6) || !(h.yards >= 50 && h.yards <= 800) || !(h.handicap >= 1 && h.handicap <= holeCount))
    if (badHole) e.holes = `Check hole ${badHole.hole}: par 3–6, yards 50–800, stroke index 1–${holeCount}`
    else if (new Set(holes.map(h => h.handicap)).size !== holes.length) e.holes = 'Each stroke index can only be used on one hole'
    else if (womenDiffer) {
      const badW = holes.find(h => !(Number(h.parWomen ?? h.par) >= 3 && Number(h.parWomen ?? h.par) <= 6) || !(Number(h.handicapWomen ?? h.handicap) >= 1 && Number(h.handicapWomen ?? h.handicap) <= holeCount))
      if (badW) e.holes = `Check women's par / SI on hole ${badW.hole}`
      else if (new Set(holes.map(h => h.handicapWomen ?? h.handicap)).size !== holes.length) e.holes = "Each women's stroke index can only be used once"
    }
    const rated = (r?: number, s?: number) => r !== undefined && s !== undefined && r >= 55 && r <= 85 && s >= 55 && s <= 155
    const badTee = teeSets.find(t => !has(t.name) || !rated(t.menRating, t.menSlope)
      || ((t.womenRating !== undefined || t.womenSlope !== undefined) && !rated(t.womenRating, t.womenSlope))
      || t.yards.some(y => !(y >= 50 && y <= 800)))
    if (!teeSets.length) e.teeSets = 'Add at least one set of tees'
    else if (badTee) e.teeSets = `Check the ${badTee.name || 'unnamed'} tees: name, rating 55–85 and slope 55–155 (men; women if given), yards 50–800 per hole`
    if (extras.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extras.email)) e.email = 'Enter a valid email'
    if (extras.website && !isUrlish(extras.website)) e.website = 'Enter a website like yourclub.com'
    if (extras.bookingUrl && !isUrlish(extras.bookingUrl)) e.bookingUrl = 'Enter a valid link'
    if (!has(imageUrl)) e.imageUrl = 'Choose or paste a photo'
    return e
  }

  function submit(ev: FormEvent) {
    ev.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) {
      requestAnimationFrame(() => document.querySelector(`#${formId} .text-red-500`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    const countryShort = country === 'United States' ? 'USA' : country
    onSave({
      ...(base ?? {}),
      id: base?.id ?? newId('c'),
      name: name.trim(),
      designer: designer.trim() || 'Unknown',
      established: established.trim() || '—',
      description: description.trim(),
      address: address.trim(),
      city: city.trim(),
      region: region.trim(),
      country,
      location: [city.trim(), region.trim(), countryShort].join(', '),
      geo: lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined,
      rating: scorecardTee.menRating!,
      slope: scorecardTee.menSlope!,
      holes: holeCount,
      holeData: holes.map(h => ({
        hole: h.hole, par: Number(h.par), yards: Number(h.yards), handicap: Number(h.handicap),
        parWomen: womenDiffer ? Number(h.parWomen ?? h.par) : undefined,
        handicapWomen: womenDiffer ? Number(h.handicapWomen ?? h.handicap) : undefined,
        name: h.name?.trim() || undefined, notes: h.notes?.trim() || undefined,
        map: h.map ?? generateHoleMap(h),
      })),
      teeSets: teeSets.map(t => ({ ...t, name: t.name.trim(), yards: t.yards.map(Number) })),
      par: totals.par,
      yardage: totals.yards,
      phone: extras.phone.trim(), email: extras.email.trim(), website: extras.website.trim(), bookingUrl: extras.bookingUrl.trim(),
      facilities: extras.facilities, dressCode: extras.dressCode.trim(), status: extras.status, statusNote: extras.statusNote.trim(),
      imageUrl: imageUrl.trim(),
    })
  }

  const cellInput = 'w-full h-9 rounded-lg bg-canvas text-center text-[13px] font-semibold text-ink border border-transparent focus:bg-white focus:border-pine-400 focus:outline-none'
  const cols = womenDiffer ? 'grid-cols-[34px_repeat(5,1fr)]' : 'grid-cols-[40px_1fr_1fr_1fr]'

  return (
    <form id={formId} onSubmit={submit} noValidate className="@container">
      <fieldset disabled={readOnly} className="space-y-4 @md:space-y-5 min-w-0">
      <FormSection title="Course details">
        <Input label="Course name" placeholder="e.g. Pine Valley Golf Club" value={name}
          onChange={e => { setName(e.target.value); clear('name') }} error={errors.name} />
        <div className="grid @md:grid-cols-2 gap-4">
          <Input label="Designer" placeholder="Optional" value={designer} onChange={e => setDesigner(e.target.value)} />
          <Input label="Established" placeholder="e.g. 1994" inputMode="numeric" value={established}
            onChange={e => { setEst(e.target.value); clear('established') }} error={errors.established} />
        </div>
        <Textarea label="Description" placeholder="Character of the course, signature holes, conditions…"
          value={description} onChange={e => { setDesc(e.target.value); clear('description') }} error={errors.description} />
      </FormSection>

      <FormSection title="Location" subtitle="Address for directions; coordinates place the course on the map">
        <Input label="Street address" placeholder="e.g. 2604 Washington Road" value={address}
          onChange={e => { setAddress(e.target.value); clear('address') }} error={errors.address} />
        <div className="grid @md:grid-cols-3 gap-4">
          <Input label="City" value={city} onChange={e => { setCity(e.target.value); clear('city') }} error={errors.city} />
          <Input label="State / region" value={region} onChange={e => { setRegion(e.target.value); clear('region') }} error={errors.region} />
          <SelectField label="Country" value={country} onChange={setCountry} options={COUNTRIES} />
        </div>
        <div className="grid grid-cols-2 @md:grid-cols-[1fr_1fr_auto] gap-4 items-start">
          <Input label="Latitude" placeholder="33.5021" inputMode="decimal" value={lat} onChange={e => { setLat(e.target.value); clear('lat') }} error={errors.lat} />
          <Input label="Longitude" placeholder="-82.0226" inputMode="decimal" value={lng} onChange={e => { setLng(e.target.value); clear('lng') }} error={errors.lng} />
          {lat && lng && !errors.lat && !errors.lng && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noreferrer"
              className="col-span-2 @md:col-span-1 @md:mt-[26px] h-[52px] px-5 rounded-full bg-canvas text-ink text-[13px] font-bold font-display inline-flex items-center justify-center hover:bg-gray-200">
              Check on map ↗
            </a>
          )}
        </div>
      </FormSection>

      <ContactFacilitiesSection value={extras} onChange={setExtras} errors={errors} />
      <CourseStatusSection value={extras} onChange={setExtras} />

      <TeeSetsSection teeSets={teeSets} onChange={changeTeeSets} scorecardTeeId={scorecardTeeId} onScorecardTee={changeScorecardTee} holes={holes} errors={errors} />

      <FormSection title="Scorecard" subtitle={scorecardLocked && !readOnly ? "View only — your role can't edit scorecards" : `Par and stroke index per hole; yards from the ${scorecardTee?.name ?? 'scorecard'} tees`}>
        <fieldset disabled={scorecardLocked} className="space-y-4 min-w-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex bg-canvas rounded-full p-1">
            {([18, 9] as const).map(n => (
              <button key={n} type="button" onClick={() => changeHoleCount(n)} aria-pressed={holeCount === n}
                className={`h-8 px-4 rounded-full text-[13px] font-bold font-display transition-all ${holeCount === n ? 'bg-ink text-white' : 'text-gray-500'}`}>
                {n} holes
              </button>
            ))}
          </div>
          <p className="text-[13px] font-semibold text-gray-500">
            Par <span className="text-ink font-bold">{totals.par}</span> · <span className="text-ink font-bold">{totals.yards.toLocaleString()}</span> yds
            {scorecardTee?.menRating !== undefined && <> · Rating <span className="text-ink font-bold">{scorecardTee.menRating}</span> / <span className="text-ink font-bold">{scorecardTee.menSlope}</span></>}
          </p>
        </div>
        <Toggle label="Women play a different par or stroke index" hint="Adds women's par and SI columns" checked={womenDiffer} onChange={setWomen} />

        <div className={`grid ${womenDiffer ? '' : '@xl:grid-cols-2'} gap-x-6 gap-y-4`}>
          {[holes.slice(0, 9), holes.slice(9)].filter(n => n.length).map((nine, k) => (
            <div key={k}>
              <div className={`grid ${cols} gap-2 px-1 pb-1.5 text-[11px] font-bold font-display text-gray-400`}>
                <span>{k === 0 ? 'Front' : 'Back'}</span><span className="text-center">Par</span><span className="text-center">Yards</span><span className="text-center">SI</span>
                {womenDiffer && <><span className="text-center">W par</span><span className="text-center">W SI</span></>}
              </div>
              <div className="space-y-1.5">
                {nine.map(h => {
                  const i = h.hole - 1
                  return (
                    <div key={h.hole} className={`grid ${cols} gap-2 items-center`}>
                      <span className="w-8 h-8 rounded-full bg-ink text-white text-[12px] font-bold font-display flex items-center justify-center">{h.hole}</span>
                      <select aria-label={`Hole ${h.hole} par`} value={h.par} onChange={e => setHole(i, 'par', e.target.value)} className={cellInput}>
                        {[3, 4, 5, 6].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input aria-label={`Hole ${h.hole} yards`} type="number" value={h.yards} onChange={e => setHole(i, 'yards', e.target.value)} className={cellInput} />
                      <input aria-label={`Hole ${h.hole} stroke index`} type="number" value={h.handicap} onChange={e => setHole(i, 'handicap', e.target.value)} className={cellInput} />
                      {womenDiffer && (
                        <>
                          <select aria-label={`Hole ${h.hole} women's par`} value={h.parWomen ?? h.par} onChange={e => setHole(i, 'parWomen', e.target.value)} className={cellInput}>
                            {[3, 4, 5, 6].map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <input aria-label={`Hole ${h.hole} women's stroke index`} type="number" value={h.handicapWomen ?? h.handicap} onChange={e => setHole(i, 'handicapWomen', e.target.value)} className={cellInput} />
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {errors.holes && <p className="text-xs text-red-500 font-medium">{errors.holes}</p>}
        </fieldset>
      </FormSection>

      <HoleGuideSection holes={holes} onChange={setHoles} scorecardYards={holes.map(h => Number(h.yards))} />

      <FormSection title="Photo">
        <PhotoPicker value={imageUrl} onChange={v => { setImageUrl(v); clear('imageUrl') }} error={errors.imageUrl} />
      </FormSection>
      </fieldset>
    </form>
  )
}
