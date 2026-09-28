import { useState, type FormEvent, type ReactNode, type TextareaHTMLAttributes } from 'react'
import type { Course, HoleData, Tournament, TournamentFormat, TournamentStatus } from '../types'
import { Input, SelectField, ChoiceChips, fieldClass } from '../components'
import { MOCK_COURSES } from '../data'
import {
  STATUS_OPTIONS, GOLF_PHOTOS, newId, formatDateRange, deriveRegistrationStatus,
  venueFieldsFromCourse, generateHoles, scorecardTotals,
} from '../store'

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

function Textarea({ label, error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
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

function DateField({ label, value, onChange, error, min }: { label: string; value: string; onChange: (v: string) => void; error?: string; min?: string }) {
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

/* ───────── Tournament form ───────── */

const FORMATS: TournamentFormat[] = ['Stroke Play', 'Stableford', 'Four-Ball', 'Scramble']

interface TournamentFormProps {
  formId: string
  initial?: Tournament
  onSave: (t: Tournament) => void
  /** View-only: every field is disabled */
  readOnly?: boolean
}

export function TournamentForm({ formId, initial, onSave, readOnly }: TournamentFormProps) {
  const [name, setName]           = useState(initial?.name ?? '')
  const [category, setCategory]   = useState(initial?.category ?? '')
  const [format, setFormat]       = useState<string>(initial?.format ?? '')
  const [status, setStatus]       = useState<string>(initial?.status ?? 'published')
  const [courseId, setCourseId]   = useState(initial?.courseId ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [endDate, setEndDate]     = useState(initial?.endDate ?? initial?.startDate ?? '')
  const [time, setTime]           = useState(initial?.time ?? '')
  const [entryFee, setEntryFee]   = useState(initial?.entryFee ?? '')
  const [prize, setPrize]         = useState(initial?.prize ?? '')
  const [maxPlayers, setMax]      = useState(String(initial?.maxPlayers ?? ''))
  const [players, setPlayers]     = useState(String(initial?.players ?? 0))
  const [description, setDesc]    = useState(initial?.description ?? '')
  const [imageUrl, setImageUrl]   = useState(initial?.imageUrl ?? GOLF_PHOTOS[0])
  const [errors, setErrors]       = useState<Record<string, string>>({})

  const courseName = (id: string) => MOCK_COURSES.find(c => c.id === id)?.name ?? ''
  const clear = (f: string) => { if (errors[f]) setErrors(x => ({ ...x, [f]: '' })) }

  function validate() {
    const e: Record<string, string> = {}
    if (!has(name)) e.name = 'Tournament name is required'
    if (!has(category)) e.category = 'Category is required'
    if (!format) e.format = 'Choose a format'
    if (!courseId) e.courseId = 'Choose a course'
    if (!startDate) e.startDate = 'Start date is required'
    if (endDate && startDate && endDate < startDate) e.endDate = "End date can't be before the start date"
    if (!has(time)) e.time = 'Tee time is required'
    if (!has(entryFee)) e.entryFee = 'Entry fee is required'
    const max = parseInt(maxPlayers, 10)
    if (!max || max < 1) e.maxPlayers = 'Enter the maximum number of players'
    const reg = parseInt(players, 10)
    if (isNaN(reg) || reg < 0) e.players = 'Enter 0 or more'
    else if (max && reg > max) e.players = `Can't exceed ${max}`
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
    const course = MOCK_COURSES.find(c => c.id === courseId)!
    const s = status as TournamentStatus
    onSave({
      id: initial?.id ?? newId('t'),
      name: name.trim(),
      category: category.trim(),
      format: format as TournamentFormat,
      status: s,
      registrationStatus: deriveRegistrationStatus(s, initial?.registrationStatus),
      courseId,
      ...venueFieldsFromCourse(course),
      startDate,
      endDate: endDate || startDate,
      dateRange: formatDateRange(startDate, endDate || startDate),
      time: time.trim(),
      entryFee: entryFee.trim(),
      prize: prize.trim(),
      maxPlayers: parseInt(maxPlayers, 10),
      players: parseInt(players, 10),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
    })
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
          <SelectField label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </div>
        <p className="text-[12px] text-gray-500 -mt-2">
          {STATUS_OPTIONS.find(o => o.value === status)?.label} — {
            status === 'registration-open' ? 'golfers can register now.'
            : status === 'published' || status === 'upcoming' ? 'visible, registration not open yet.'
            : status === 'cancelled' ? 'shown as cancelled; registration disabled.'
            : 'registration disabled.'}
        </p>
        <ChoiceChips label="Format" options={FORMATS} value={format}
          onChange={v => { setFormat(v as string); clear('format') }} error={errors.format} />
      </FormSection>

      <FormSection title="Schedule & venue">
        <SelectField label="Course" placeholder="Select a course" value={courseId}
          onChange={v => { setCourseId(v); clear('courseId') }}
          options={MOCK_COURSES.map(c => ({ value: c.id, label: c.name }))} error={errors.courseId} />
        {courseId && <p className="text-[12px] text-gray-500 -mt-2">Venue and location fill in from {courseName(courseId)}</p>}
        <div className="grid @md:grid-cols-3 gap-4">
          <DateField label="Start date" value={startDate} error={errors.startDate}
            onChange={v => { setStartDate(v); clear('startDate'); if (!endDate || endDate < v) setEndDate(v) }} />
          <DateField label="End date" value={endDate} min={startDate} error={errors.endDate}
            onChange={v => { setEndDate(v); clear('endDate') }} />
          <Input label="Tee time" placeholder="e.g. 8:00 AM shotgun start" value={time}
            onChange={e => { setTime(e.target.value); clear('time') }} error={errors.time} />
        </div>
        {startDate && <p className="text-[12px] text-gray-500 -mt-2">Shown to golfers as <span className="font-semibold text-ink">{formatDateRange(startDate, endDate || startDate)}</span></p>}
      </FormSection>

      <FormSection title="Registration">
        <div className="grid grid-cols-2 @md:grid-cols-4 gap-4">
          <Input label="Entry fee" placeholder="$150" value={entryFee}
            onChange={e => { setEntryFee(e.target.value); clear('entryFee') }} error={errors.entryFee} />
          <Input label="Max players" type="number" min={1} placeholder="120" value={maxPlayers}
            onChange={e => { setMax(e.target.value); clear('maxPlayers'); clear('players') }} error={errors.maxPlayers} />
          <Input label="Registered" type="number" min={0} value={players}
            onChange={e => { setPlayers(e.target.value); clear('players') }} error={errors.players} />
          <Input label="Prize" placeholder="Optional" value={prize} onChange={e => setPrize(e.target.value)} />
        </div>
      </FormSection>

      <FormSection title="Details">
        <Textarea label="Description" placeholder="What makes this event special, who it's for, what's included…"
          value={description} onChange={e => { setDesc(e.target.value); clear('description') }} error={errors.description} />
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

export function CourseForm({ formId, initial, onSave, readOnly, scorecardLocked }: CourseFormProps) {
  const [name, setName]           = useState(initial?.name ?? '')
  const [designer, setDesigner]   = useState(initial?.designer ?? '')
  const [established, setEst]     = useState(initial?.established ?? '')
  const [description, setDesc]    = useState(initial?.description ?? '')
  const [address, setAddress]     = useState(initial?.address ?? '')
  const [city, setCity]           = useState(initial?.city ?? '')
  const [region, setRegion]       = useState(initial?.region ?? '')
  const [country, setCountry]     = useState(initial?.country ?? 'United States')
  const [rating, setRating]       = useState(initial ? String(initial.rating) : '')
  const [slope, setSlope]         = useState(initial ? String(initial.slope) : '')
  const [holeCount, setHoleCount] = useState<9 | 18>((initial?.holes === 9 ? 9 : 18))
  const [holes, setHoles]         = useState<HoleData[]>(() => generateHoles(initial?.holes === 9 ? 9 : 18, initial?.holeData))
  const [imageUrl, setImageUrl]   = useState(initial?.imageUrl ?? GOLF_PHOTOS[1])
  const [errors, setErrors]       = useState<Record<string, string>>({})

  const clear = (f: string) => { if (errors[f]) setErrors(x => ({ ...x, [f]: '' })) }
  const totals = scorecardTotals(holes)

  function changeHoleCount(n: 9 | 18) {
    setHoleCount(n)
    setHoles(h => generateHoles(n, h))
    clear('holes')
  }

  function setHole(i: number, field: 'par' | 'yards' | 'handicap', value: string) {
    setHoles(h => h.map((x, j) => (j === i ? { ...x, [field]: value === '' ? ('' as unknown as number) : Number(value) } : x)))
    clear('holes')
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!has(name)) e.name = 'Course name is required'
    if (!has(description)) e.description = 'Add a short description'
    if (!has(address)) e.address = 'Address is required'
    if (!has(city)) e.city = 'City is required'
    if (!has(region)) e.region = 'State / region is required'
    if (established && !/^\d{4}$/.test(established)) e.established = 'Use a 4-digit year'
    const r = parseFloat(rating)
    if (isNaN(r) || r < 55 || r > 85) e.rating = 'Between 55 and 85'
    const s = parseInt(slope, 10)
    if (isNaN(s) || s < 55 || s > 155) e.slope = 'Between 55 and 155'
    const bad = holes.find(h => !(h.par >= 3 && h.par <= 6) || !(h.yards >= 50 && h.yards <= 800) || !(h.handicap >= 1 && h.handicap <= holeCount))
    if (bad) e.holes = `Check hole ${bad.hole}: par 3–6, yards 50–800, stroke index 1–${holeCount}`
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
      ...(initial ?? {}),
      id: initial?.id ?? newId('c'),
      name: name.trim(),
      designer: designer.trim() || 'Unknown',
      established: established.trim() || '—',
      description: description.trim(),
      address: address.trim(),
      city: city.trim(),
      region: region.trim(),
      country,
      location: [city.trim(), region.trim(), countryShort].join(', '),
      rating: parseFloat(rating),
      slope: parseInt(slope, 10),
      holes: holeCount,
      holeData: holes.map(h => ({ hole: h.hole, par: Number(h.par), yards: Number(h.yards), handicap: Number(h.handicap) })),
      par: totals.par,
      yardage: totals.yards,
      imageUrl: imageUrl.trim(),
    })
  }

  const cellInput = 'w-full h-9 rounded-lg bg-canvas text-center text-[13px] font-semibold text-ink border border-transparent focus:bg-white focus:border-pine-400 focus:outline-none'

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

      <FormSection title="Location">
        <Input label="Street address" placeholder="e.g. 2604 Washington Road" value={address}
          onChange={e => { setAddress(e.target.value); clear('address') }} error={errors.address} />
        <div className="grid @md:grid-cols-3 gap-4">
          <Input label="City" value={city} onChange={e => { setCity(e.target.value); clear('city') }} error={errors.city} />
          <Input label="State / region" value={region} onChange={e => { setRegion(e.target.value); clear('region') }} error={errors.region} />
          <SelectField label="Country" value={country} onChange={setCountry} options={COUNTRIES} />
        </div>
      </FormSection>

      <FormSection title="Ratings">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Course rating" type="number" step="0.1" placeholder="72.4" value={rating}
            onChange={e => { setRating(e.target.value); clear('rating') }} error={errors.rating} />
          <Input label="Slope" type="number" placeholder="130" value={slope}
            onChange={e => { setSlope(e.target.value); clear('slope') }} error={errors.slope} />
        </div>
      </FormSection>

      <FormSection title="Scorecard" subtitle={scorecardLocked && !readOnly ? "View only — your role can't edit scorecards" : "Par and yardage total up automatically"}>
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
          </p>
        </div>

        <div className="grid @xl:grid-cols-2 gap-x-6">
          {[holes.slice(0, 9), holes.slice(9)].filter(n => n.length).map((nine, k) => (
            <div key={k}>
              <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-2 px-1 pb-1.5 text-[11px] font-bold font-display text-gray-400">
                <span>{k === 0 ? 'Front' : 'Back'}</span><span className="text-center">Par</span><span className="text-center">Yards</span><span className="text-center">SI</span>
              </div>
              <div className="space-y-1.5">
                {nine.map(h => {
                  const i = h.hole - 1
                  return (
                    <div key={h.hole} className="grid grid-cols-[40px_1fr_1fr_1fr] gap-2 items-center">
                      <span className="w-8 h-8 rounded-full bg-ink text-white text-[12px] font-bold font-display flex items-center justify-center">{h.hole}</span>
                      <select aria-label={`Hole ${h.hole} par`} value={h.par} onChange={e => setHole(i, 'par', e.target.value)} className={cellInput}>
                        {[3, 4, 5, 6].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input aria-label={`Hole ${h.hole} yards`} type="number" value={h.yards} onChange={e => setHole(i, 'yards', e.target.value)} className={cellInput} />
                      <input aria-label={`Hole ${h.hole} stroke index`} type="number" value={h.handicap} onChange={e => setHole(i, 'handicap', e.target.value)} className={cellInput} />
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

      <FormSection title="Photo">
        <PhotoPicker value={imageUrl} onChange={v => { setImageUrl(v); clear('imageUrl') }} error={errors.imageUrl} />
      </FormSection>
      </fieldset>
    </form>
  )
}
