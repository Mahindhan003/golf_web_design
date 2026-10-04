import { useState } from 'react'
import type { CourseStatus, HoleData, HoleHazard, Point, TeeSet } from '../types'
import { Input, SelectField, ChoiceChips } from '../components'
import { COURSE_STATUS_OPTIONS, FACILITIES, TEE_COLORS, dist, generateHoleMap, teeSwatch, teeTotal, uid } from '../golf'
import { HoleMapView } from '../hole-map'
import { FormSection, Textarea, AddRowButton, RemoveRowButton } from './forms'

/*
 * The structured parts of the course form: tee sets, contact & facilities, course status and
 * the hole-by-hole guide with its map editor. The parent form owns validation and saving.
 */

type Errors = Record<string, string>
const str = (n?: number) => (n === undefined || Number.isNaN(n) ? '' : String(n))
const num = (v: string) => (v.trim() === '' ? undefined : Number(v))

/* ───────── Tee sets ───────── */

export function TeeSetsSection({ teeSets, onChange, scorecardTeeId, onScorecardTee, holes, errors }: {
  teeSets: TeeSet[]; onChange: (t: TeeSet[]) => void
  scorecardTeeId: string; onScorecardTee: (id: string) => void
  holes: HoleData[]; errors: Errors
}) {
  const [open, setOpen] = useState<string | null>(null)
  const update = (i: number, patch: Partial<TeeSet>) => onChange(teeSets.map((t, j) => (j === i ? { ...t, ...patch } : t)))
  const setYard = (i: number, hole: number, v: string) =>
    update(i, { yards: teeSets[i].yards.map((y, k) => (k === hole ? (v === '' ? ('' as unknown as number) : Number(v)) : y)) })

  return (
    <FormSection title="Tee sets" subtitle="Rating and slope are per tee (and per gender) — handicaps are calculated from them">
      <div className="space-y-3">
        {teeSets.map((t, i) => {
          const isScorecard = t.id === scorecardTeeId
          return (
            <div key={t.id} className="rounded-2xl bg-canvas p-3 @md:p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 mt-[26px] rounded-full ring-2 ring-black/10 flex-shrink-0" style={{ background: teeSwatch(t.color) }} />
                <div className="grid grid-cols-2 @md:grid-cols-[1.2fr_1fr_repeat(4,0.8fr)] gap-3 flex-1">
                  <Input label="Name" value={t.name} onChange={e => update(i, { name: e.target.value })} />
                  <SelectField label="Colour" value={t.color} onChange={v => update(i, { color: v })} options={TEE_COLORS.map(c => c.value)} />
                  <Input label="Men rating" type="number" step="0.1" value={str(t.menRating)} onChange={e => update(i, { menRating: num(e.target.value) })} />
                  <Input label="Men slope" type="number" value={str(t.menSlope)} onChange={e => update(i, { menSlope: num(e.target.value) })} />
                  <Input label="Women rating" type="number" step="0.1" placeholder="—" value={str(t.womenRating)} onChange={e => update(i, { womenRating: num(e.target.value) })} />
                  <Input label="Women slope" type="number" placeholder="—" value={str(t.womenSlope)} onChange={e => update(i, { womenSlope: num(e.target.value) })} />
                </div>
                {teeSets.length > 1 && !isScorecard && <RemoveRowButton label={`Remove ${t.name} tees`} onClick={() => onChange(teeSets.filter((_, j) => j !== i))} />}
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-[52px]">
                <span className="text-[13px] font-semibold text-ink">{teeTotal(t).toLocaleString()} yds</span>
                <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)} className="h-8 px-3 rounded-full bg-white text-[12px] font-bold font-display text-ink hover:bg-gray-100">
                  {open === t.id ? 'Hide yards per hole' : 'Edit yards per hole'}
                </button>
                <label className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white text-[12px] font-semibold text-gray-600 cursor-pointer">
                  <input type="radio" name="scorecard-tee" checked={isScorecard} onChange={() => onScorecardTee(t.id)} className="accent-[#0c1a12]" />
                  Scorecard tees
                </label>
              </div>
              {open === t.id && (
                <div className="grid grid-cols-6 @md:grid-cols-9 gap-1.5 pl-[52px]">
                  {holes.map((h, k) => (
                    <label key={h.hole} className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-bold text-gray-400">{h.hole}</span>
                      <input type="number" aria-label={`${t.name} hole ${h.hole} yards`} value={t.yards[k] ?? ''} onChange={e => setYard(i, k, e.target.value)}
                        className="w-full h-8 rounded-lg bg-white text-center text-[12px] font-semibold text-ink border border-transparent focus:border-pine-400 focus:outline-none" />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {errors.teeSets && <p className="text-xs text-red-500 font-medium">{errors.teeSets}</p>}
      <AddRowButton label="Add tee set" onClick={() => {
        const used = new Set(teeSets.map(t => t.color))
        const color = TEE_COLORS.find(c => !used.has(c.value))?.value ?? 'White'
        onChange([...teeSets, { id: uid('tee-'), name: color, color, yards: holes.map(h => Math.round(h.yards * 0.94)) }])
      }} />
    </FormSection>
  )
}

/* ───────── Contact, facilities, status ───────── */

export interface CourseExtras {
  phone: string
  email: string
  website: string
  bookingUrl: string
  facilities: string[]
  dressCode: string
  status: CourseStatus
  statusNote: string
}

export function ContactFacilitiesSection({ value, onChange, errors }: { value: CourseExtras; onChange: (v: CourseExtras) => void; errors: Errors }) {
  const set = (patch: Partial<CourseExtras>) => onChange({ ...value, ...patch })
  return (
    <FormSection title="Contact & facilities" subtitle="What golfers need to plan their day">
      <div className="grid @md:grid-cols-2 gap-4">
        <Input label="Phone" type="tel" value={value.phone} onChange={e => set({ phone: e.target.value })} />
        <Input label="Email" type="email" value={value.email} onChange={e => set({ email: e.target.value })} error={errors.email} />
        <Input label="Website" placeholder="yourclub.com" value={value.website} onChange={e => set({ website: e.target.value })} error={errors.website} />
        <Input label="Tee-time booking link" placeholder="https://" value={value.bookingUrl} onChange={e => set({ bookingUrl: e.target.value })} error={errors.bookingUrl} />
      </div>
      <ChoiceChips label="Facilities" options={FACILITIES} value={value.facilities} onChange={v => set({ facilities: v as string[] })} />
      <Input label="Dress code" placeholder="e.g. Collared shirts; soft spikes only" value={value.dressCode} onChange={e => set({ dressCode: e.target.value })} />
    </FormSection>
  )
}

export function CourseStatusSection({ value, onChange }: { value: CourseExtras; onChange: (v: CourseExtras) => void }) {
  return (
    <FormSection title="Course status" subtitle="Shown on the course page and to organisers choosing a venue">
      <div className="grid @md:grid-cols-[240px_1fr] gap-4">
        <SelectField label="Status" value={value.status} onChange={v => onChange({ ...value, status: v as CourseStatus })} options={COURSE_STATUS_OPTIONS} />
        <Input label="Note for golfers" placeholder="e.g. Greens on 4 and 11 are being re-turfed; temporary greens in play"
          value={value.statusNote} onChange={e => onChange({ ...value, statusNote: e.target.value })} />
      </div>
    </FormSection>
  )
}

/* ───────── Hole guide and map editor ───────── */

type PlaceMode = 'tee' | 'green' | 'dogleg' | 'bunker' | 'water' | 'trees' | 'erase'

const PLACE_MODES: { value: PlaceMode; label: string }[] = [
  { value: 'green', label: 'Move green' },
  { value: 'tee', label: 'Move tee' },
  { value: 'dogleg', label: 'Move dogleg' },
  { value: 'bunker', label: 'Add bunker' },
  { value: 'water', label: 'Add water' },
  { value: 'trees', label: 'Add trees' },
  { value: 'erase', label: 'Remove hazard' },
]

export function HoleGuideSection({ holes, onChange, scorecardYards }: {
  holes: HoleData[]; onChange: (h: HoleData[]) => void; scorecardYards: number[]
}) {
  const [index, setIndex] = useState(0)
  const [mode, setMode] = useState<PlaceMode>('green')
  const hole = holes[Math.min(index, holes.length - 1)]
  const map = hole.map ?? generateHoleMap(hole)

  const update = (patch: Partial<HoleData>) => onChange(holes.map((h, j) => (j === index ? { ...h, ...patch } : h)))

  function place(p: Point) {
    const next = { ...map, path: [...map.path], hazards: [...map.hazards] }
    if (mode === 'green') {
      const depth = Math.max(8, Math.round(dist(map.greenFront, map.greenBack) / 2))
      next.greenCentre = p
      next.greenFront = { x: p.x, y: p.y - depth }
      next.greenBack = { x: p.x, y: p.y + depth }
      next.path[next.path.length - 1] = p
    } else if (mode === 'tee') {
      next.tee = p
      next.path[0] = p
    } else if (mode === 'dogleg') {
      if (next.path.length > 2) next.path[1] = p
      else next.path.splice(1, 0, p)
    } else if (mode === 'erase') {
      const nearest = [...map.hazards].sort((a, b) => dist(a.at, p) - dist(b.at, p))[0]
      if (nearest && dist(nearest.at, p) <= nearest.size + 12) next.hazards = map.hazards.filter(h => h.id !== nearest.id)
    } else {
      const hazard: HoleHazard = { id: uid('hz'), type: mode, at: p, size: mode === 'water' ? 16 : mode === 'trees' ? 10 : 7 }
      next.hazards.push(hazard)
    }
    update({ map: next })
  }

  const mapLength = dist(map.tee, map.greenCentre)
  const card = scorecardYards[index] ?? hole.yards
  const mismatch = Math.abs(mapLength - card) > Math.max(15, card * 0.08)

  return (
    <FormSection title="Hole guide & map" subtitle="Names, notes and the layout golfers see in live play and distances">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {holes.map((h, i) => (
          <button key={h.hole} type="button" onClick={() => setIndex(i)} aria-pressed={i === index}
            className={`w-9 h-9 rounded-full text-[13px] font-bold font-display flex-shrink-0 ${i === index ? 'bg-ink text-white' : 'bg-canvas text-gray-600 hover:bg-gray-200'}`}>
            {h.hole}
          </button>
        ))}
      </div>

      <div className="grid @xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 items-start">
        <div className="space-y-4">
          <p className="text-[13px] text-gray-500">
            Hole <span className="font-semibold text-ink">{hole.hole}</span> · Par {hole.par} · {card} yds · SI {hole.handicap}
          </p>
          <Input label="Hole name (optional)" placeholder="e.g. Pine Hollow" value={hole.name ?? ''} onChange={e => update({ name: e.target.value })} />
          <Textarea label="Notes for golfers" placeholder="How the hole plays, where to miss, green slopes…" value={hole.notes ?? ''}
            onChange={e => update({ notes: e.target.value })} style={{ minHeight: 100 }} />
          <ChoiceChips label="Click on the map to" options={PLACE_MODES} value={mode} onChange={v => setMode(v as PlaceMode)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => update({ map: generateHoleMap({ ...hole, yards: card }) })}
              className="h-9 px-4 rounded-full bg-canvas text-[13px] font-bold font-display text-ink hover:bg-gray-200">Regenerate layout</button>
          </div>
          {mismatch && (
            <p className="text-[12px] font-semibold text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              The map measures {mapLength} yds tee to green but the scorecard says {card}. Move the green, or regenerate the layout.
            </p>
          )}
          <p className="text-[12px] text-gray-400">
            Prototype grid in yards. In production each point is a GPS coordinate captured on the course or traced on satellite imagery.
          </p>
        </div>
        <HoleMapView map={map} size="lg" onPick={place} highlight={mode === 'tee' ? 'tee' : mode === 'green' ? 'green' : 'hazard'} ariaLabel={`Hole ${hole.hole} map editor`} />
      </div>
    </FormSection>
  )
}
