import type {
  Course, Division, Eligibility, Official, Prize, RegistrationWindow, ScoringRules,
  TeeSheetSettings, TournamentFees, TournamentRound,
} from '../types'
import { Input, SelectField, ChoiceChips, fieldClass } from '../components'
import {
  CURRENCIES, FEE_INCLUDES, ROUND_HOLE_OPTIONS, SCORING_BASIS_OPTIONS, TIE_BREAK_OPTIONS,
  addMinutes, formatClock, formatMoney, teeSwatch, teeTotal, uid,
} from '../golf'
import { FormSection, Textarea, DateField, Toggle, AddRowButton, RemoveRowButton } from './forms'

/*
 * The structured parts of the tournament form. Each section edits one slice of the tournament
 * and reports changes upward; the parent form owns validation and saving.
 */

type Errors = Record<string, string>
const num = (v: string) => (v.trim() === '' ? undefined : Number(v))
const str = (n?: number) => (n === undefined || Number.isNaN(n) ? '' : String(n))

function DateTimeField({ label, value, onChange, error, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-gray-600 font-display">{label}</label>
      <input type="datetime-local" value={value} onChange={e => onChange(e.target.value)} className={`${fieldClass(!!error)} ${value ? '' : 'text-gray-400'}`} />
      {error ? <p className="text-xs text-red-500 font-medium">{error}</p> : hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

/* ───────── Rounds ───────── */

export function RoundsSection({ rounds, onChange, startDate, endDate, error }: {
  rounds: TournamentRound[]; onChange: (r: TournamentRound[]) => void; startDate: string; endDate: string; error?: string
}) {
  const update = (i: number, patch: Partial<TournamentRound>) => onChange(rounds.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <FormSection title="Rounds" subtitle="Each round's date and which holes it is played over">
      <div className="space-y-3">
        {rounds.map((r, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-10 h-10 mt-[26px] rounded-full bg-ink text-white text-[13px] font-bold font-display flex items-center justify-center flex-shrink-0">R{r.number}</span>
            <div className="grid @md:grid-cols-2 gap-3 flex-1">
              <DateField label={`Round ${r.number} date`} value={r.date} min={startDate} onChange={v => update(i, { date: v })} />
              <SelectField label="Holes" value={r.holes} onChange={v => update(i, { holes: v as TournamentRound['holes'] })} options={ROUND_HOLE_OPTIONS} />
            </div>
            {rounds.length > 1 && <RemoveRowButton label={`Remove round ${r.number}`} onClick={() => onChange(rounds.filter((_, j) => j !== i).map((x, k) => ({ ...x, number: k + 1 })))} />}
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      {rounds.length < 4 && (
        <AddRowButton label="Add round" onClick={() => onChange([...rounds, { number: rounds.length + 1, date: endDate || startDate, holes: 'all' }])} />
      )}
    </FormSection>
  )
}

/* ───────── Scoring ───────── */

export function ScoringSection({ value, onChange, rounds, format, errors }: {
  value: ScoringRules; onChange: (v: ScoringRules) => void; rounds: number; format: string; errors: Errors
}) {
  const set = (patch: Partial<ScoringRules>) => onChange({ ...value, ...patch })
  return (
    <FormSection title="Scoring rules" subtitle="How results are calculated and ties are broken">
      {format === 'Stableford'
        ? <p className="text-[13px] text-gray-500 bg-canvas rounded-2xl px-4 py-3">Stableford is scored on net points per hole (2 for a net par).</p>
        : <ChoiceChips label="Scoring" options={SCORING_BASIS_OPTIONS} value={value.basis} onChange={v => set({ basis: v as ScoringRules['basis'] })} />}
      <div className="grid grid-cols-2 @md:grid-cols-3 gap-4">
        <Input label="Handicap allowance (%)" type="number" min={0} max={100} value={str(value.allowancePct)}
          onChange={e => set({ allowancePct: Number(e.target.value) })} error={errors.allowancePct} hint="WHS: 95% for individual stroke play" />
        <Input label="Max handicap index" type="number" step="0.1" value={str(value.maxHandicap)}
          onChange={e => set({ maxHandicap: Number(e.target.value) })} error={errors.maxHandicap} />
        <SelectField label="Ties" value={value.tieBreak} onChange={v => set({ tieBreak: v as ScoringRules['tieBreak'] })} options={TIE_BREAK_OPTIONS} />
      </div>
      {rounds > 1 && (
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Cut" value={String(value.cutAfterRound)} onChange={v => set({ cutAfterRound: Number(v) })}
            options={[{ value: '0', label: 'No cut' }, ...Array.from({ length: rounds - 1 }, (_, i) => ({ value: String(i + 1), label: `After round ${i + 1}` }))]} />
          {value.cutAfterRound > 0 && (
            <Input label="Top players (and ties)" type="number" min={1} value={str(value.cutSize)}
              onChange={e => set({ cutSize: Number(e.target.value) })} error={errors.cutSize} />
          )}
        </div>
      )}
    </FormSection>
  )
}

/* ───────── Eligibility ───────── */

export function EligibilitySection({ value, onChange, errors }: { value: Eligibility; onChange: (v: Eligibility) => void; errors: Errors }) {
  const set = (patch: Partial<Eligibility>) => onChange({ ...value, ...patch })
  return (
    <FormSection title="Who can enter" subtitle="Checked when a golfer registers">
      <ChoiceChips label="Players" value={value.gender} onChange={v => set({ gender: v as Eligibility['gender'] })}
        options={[{ value: 'open', label: 'Open to all' }, { value: 'men', label: 'Men' }, { value: 'women', label: 'Women' }]} />
      <div className="grid grid-cols-2 @md:grid-cols-4 gap-4">
        <Input label="Min handicap" type="number" step="0.1" placeholder="Any" value={str(value.minHandicap)} onChange={e => set({ minHandicap: num(e.target.value) })} />
        <Input label="Max handicap" type="number" step="0.1" placeholder="Any" value={str(value.maxHandicap)} onChange={e => set({ maxHandicap: num(e.target.value) })} error={errors.eligibilityHandicap} />
        <Input label="Min age" type="number" placeholder="Any" value={str(value.minAge)} onChange={e => set({ minAge: num(e.target.value) })} />
        <Input label="Max age" type="number" placeholder="Any" value={str(value.maxAge)} onChange={e => set({ maxAge: num(e.target.value) })} error={errors.eligibilityAge} />
      </div>
      <Toggle label="Official handicap required" hint="Golfers must have a handicap from a recognised body" checked={value.officialHandicapRequired} onChange={v => set({ officialHandicapRequired: v })} />
      <Toggle label="Members only" hint="Only members of the host club can register" checked={value.membersOnly} onChange={v => set({ membersOnly: v })} />
    </FormSection>
  )
}

/* ───────── Divisions ───────── */

export function DivisionsSection({ divisions, onChange, course, error }: {
  divisions: Division[]; onChange: (d: Division[]) => void; course?: Course; error?: string
}) {
  const tees = course?.teeSets ?? []
  const update = (i: number, patch: Partial<Division>) => onChange(divisions.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  return (
    <FormSection title="Divisions" subtitle="Flights by handicap range, each playing from a set of tees">
      {!course && <p className="text-[13px] text-gray-500">Choose a course first to pick tees.</p>}
      <div className="space-y-3">
        {divisions.map((d, i) => (
          <div key={d.id} className="flex items-start gap-3">
            <div className="grid grid-cols-2 @md:grid-cols-[2fr_1fr_1fr_1.6fr] gap-3 flex-1">
              <Input label="Division name" value={d.name} onChange={e => update(i, { name: e.target.value })} />
              <Input label="Min hcp" type="number" step="0.1" value={str(d.minHandicap)} onChange={e => update(i, { minHandicap: Number(e.target.value) })} />
              <Input label="Max hcp" type="number" step="0.1" value={str(d.maxHandicap)} onChange={e => update(i, { maxHandicap: Number(e.target.value) })} />
              <SelectField label="Tees" placeholder="Choose tees" value={d.teeSetId} onChange={v => update(i, { teeSetId: v })}
                options={tees.map(t => ({ value: t.id, label: `${t.name} · ${teeTotal(t).toLocaleString()} yds` }))} />
            </div>
            {divisions.length > 1 && <RemoveRowButton label={`Remove ${d.name || 'division'}`} onClick={() => onChange(divisions.filter((_, j) => j !== i))} />}
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <AddRowButton label="Add division" onClick={() => onChange([...divisions, { id: uid('div'), name: '', minHandicap: 0, maxHandicap: 36, teeSetId: tees[0]?.id ?? '' }])} />
        {tees.length > 0 && (
          <span className="flex gap-1.5">
            {tees.map(t => <span key={t.id} className="inline-flex items-center gap-1 text-[12px] text-gray-500"><span className="w-3 h-3 rounded-full ring-1 ring-black/15" style={{ background: teeSwatch(t.color) }} />{t.name}</span>)}
          </span>
        )}
      </div>
    </FormSection>
  )
}

/* ───────── Registration window ───────── */

export function RegistrationSection({ value, onChange, maxPlayers, onMaxPlayers, registered, errors }: {
  value: RegistrationWindow; onChange: (v: RegistrationWindow) => void
  maxPlayers: string; onMaxPlayers: (v: string) => void; registered: number; errors: Errors
}) {
  const set = (patch: Partial<RegistrationWindow>) => onChange({ ...value, ...patch })
  return (
    <FormSection title="Registration" subtitle={`${registered} registered so far — counted from entries, not typed in`}>
      <div className="grid @md:grid-cols-3 gap-4">
        <DateTimeField label="Opens" value={value.opensAt} onChange={v => set({ opensAt: v })} error={errors.opensAt} />
        <DateTimeField label="Closes" value={value.closesAt} onChange={v => set({ closesAt: v })} error={errors.closesAt} />
        <DateTimeField label="Withdraw without penalty until" value={value.withdrawBy} onChange={v => set({ withdrawBy: v })} error={errors.withdrawBy} />
      </div>
      <div className="grid @md:grid-cols-[180px_1fr] gap-4 items-start">
        <Input label="Max players" type="number" min={1} placeholder="120" value={maxPlayers} onChange={e => onMaxPlayers(e.target.value)} error={errors.maxPlayers} />
        <div className="@md:pt-7"><Toggle label="Waiting list when full" hint="Golfers can join a waitlist and are promoted when a spot frees up" checked={value.waitlist} onChange={v => set({ waitlist: v })} /></div>
      </div>
      <Textarea label="Refund policy" value={value.refundPolicy} onChange={e => set({ refundPolicy: e.target.value })} style={{ minHeight: 80 }} />
    </FormSection>
  )
}

/* ───────── Fees ───────── */

export function FeesSection({ value, onChange, errors }: { value: TournamentFees; onChange: (v: TournamentFees) => void; errors: Errors }) {
  const set = (patch: Partial<TournamentFees>) => onChange({ ...value, ...patch })
  return (
    <FormSection title="Entry fees" subtitle={`Shown to golfers as ${formatMoney(value.amount, value.currency)}${value.perTeam ? ' per team' : ''}`}>
      <div className="grid grid-cols-2 @md:grid-cols-4 gap-4">
        <SelectField label="Currency" value={value.currency} onChange={v => set({ currency: v })} options={CURRENCIES} />
        <Input label="Entry fee" type="number" min={0} step="0.01" value={str(value.amount)} onChange={e => set({ amount: Number(e.target.value) })} error={errors.amount} />
        <Input label="Member price" type="number" min={0} step="0.01" placeholder="Same" value={str(value.memberAmount)} onChange={e => set({ memberAmount: num(e.target.value) })} />
        <Input label="Early-bird price" type="number" min={0} step="0.01" placeholder="None" value={str(value.earlyBirdAmount)} onChange={e => set({ earlyBirdAmount: num(e.target.value) })} />
      </div>
      {value.earlyBirdAmount !== undefined && (
        <div className="grid @md:grid-cols-3 gap-4">
          <DateField label="Early-bird ends" value={value.earlyBirdUntil ?? ''} onChange={v => set({ earlyBirdUntil: v })} error={errors.earlyBirdUntil} />
        </div>
      )}
      <Toggle label="Fee is per team" hint="For pairs and scramble formats" checked={value.perTeam} onChange={v => set({ perTeam: v })} />
      <ChoiceChips label="Entry includes" options={FEE_INCLUDES} value={value.includes} onChange={v => set({ includes: v as string[] })} />
    </FormSection>
  )
}

/* ───────── Prizes ───────── */

export function PrizesSection({ prizes, onChange, divisions }: { prizes: Prize[]; onChange: (p: Prize[]) => void; divisions: Division[] }) {
  const update = (i: number, patch: Partial<Prize>) => onChange(prizes.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  return (
    <FormSection title="Prizes" subtitle="Overall, per division and on-course contests">
      <div className="space-y-3">
        {prizes.map((p, i) => (
          <div key={p.id} className="flex items-start gap-3">
            <div className="grid @md:grid-cols-[1.4fr_1fr_1.6fr] gap-3 flex-1">
              <Input label="Prize" placeholder="e.g. Gross champion" value={p.label} onChange={e => update(i, { label: e.target.value })} />
              <SelectField label="For" value={p.divisionId ?? ''} onChange={v => update(i, { divisionId: v || undefined })}
                options={[{ value: '', label: 'Overall' }, ...divisions.map(d => ({ value: d.id, label: d.name || 'Unnamed division' }))]} />
              <Input label="Award" placeholder="e.g. Trophy + $500" value={p.value} onChange={e => update(i, { value: e.target.value })} />
            </div>
            <RemoveRowButton label={`Remove ${p.label || 'prize'}`} onClick={() => onChange(prizes.filter((_, j) => j !== i))} />
          </div>
        ))}
      </div>
      <AddRowButton label="Add prize" onClick={() => onChange([...prizes, { id: uid('prz'), label: '', value: '' }])} />
    </FormSection>
  )
}

/* ───────── Tee sheet ───────── */

export function TeeSheetSection({ value, onChange, maxPlayers, holeCount, errors }: {
  value: TeeSheetSettings; onChange: (v: TeeSheetSettings) => void; maxPlayers: number; holeCount: number; errors: Errors
}) {
  const set = (patch: Partial<TeeSheetSettings>) => onChange({ ...value, ...patch })
  const groups = maxPlayers > 0 ? Math.ceil(maxPlayers / value.groupSize) : 0
  const lastTee = value.startType === 'shotgun' ? value.firstTeeTime
    : addMinutes(value.firstTeeTime, (value.startingTees === 'first-and-tenth' ? Math.ceil(groups / 2) - 1 : groups - 1) * value.intervalMinutes)
  return (
    <FormSection title="Tee sheet" subtitle="How groups are started on the day; groups are built from the registered field">
      <ChoiceChips label="Start" value={value.startType} onChange={v => set({ startType: v as TeeSheetSettings['startType'] })}
        options={[{ value: 'tee-times', label: 'Tee times' }, { value: 'shotgun', label: 'Shotgun start' }]} />
      <div className="grid grid-cols-2 @md:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-gray-600 font-display">{value.startType === 'shotgun' ? 'Shotgun time' : 'First tee time'}</label>
          <input type="time" value={value.firstTeeTime} onChange={e => set({ firstTeeTime: e.target.value })} className={fieldClass(!!errors.firstTeeTime)} />
        </div>
        {value.startType === 'tee-times' && (
          <Input label="Interval (min)" type="number" min={5} max={20} value={String(value.intervalMinutes)} onChange={e => set({ intervalMinutes: Number(e.target.value) })} error={errors.intervalMinutes} />
        )}
        <SelectField label="Group size" value={String(value.groupSize)} onChange={v => set({ groupSize: Number(v) as TeeSheetSettings['groupSize'] })}
          options={[{ value: '2', label: '2 players' }, { value: '3', label: '3 players' }, { value: '4', label: '4 players' }]} />
        {value.startType === 'tee-times' && holeCount === 18 && (
          <SelectField label="Starting tees" value={value.startingTees} onChange={v => set({ startingTees: v as TeeSheetSettings['startingTees'] })}
            options={[{ value: 'first', label: '1st tee only' }, { value: 'first-and-tenth', label: '1st and 10th' }]} />
        )}
      </div>
      {groups > 0 && (
        <p className="text-[13px] text-gray-500 bg-canvas rounded-2xl px-4 py-3">
          A full field is <span className="font-semibold text-ink">{groups} groups</span>
          {value.startType === 'shotgun'
            ? <> starting together at {formatClock(value.firstTeeTime)}{groups > holeCount ? <span className="text-rose-600 font-semibold"> — more groups than holes; use two groups per tee or tee times</span> : ''}.</>
            : <>, first off {formatClock(value.firstTeeTime)}, last off about {formatClock(lastTee)}.</>}
        </p>
      )}
    </FormSection>
  )
}

/* ───────── Officials & contact ───────── */

export function OfficialsSection({ officials, onChange, email, phone, onEmail, onPhone, errors }: {
  officials: Official[]; onChange: (o: Official[]) => void
  email: string; phone: string; onEmail: (v: string) => void; onPhone: (v: string) => void; errors: Errors
}) {
  const update = (i: number, patch: Partial<Official>) => onChange(officials.map((o, j) => (j === i ? { ...o, ...patch } : o)))
  return (
    <FormSection title="Contacts & officials" subtitle="Who golfers contact, and who runs the day">
      <div className="grid @md:grid-cols-2 gap-4">
        <Input label="Tournament email" type="email" placeholder="events@yourclub.com" value={email} onChange={e => onEmail(e.target.value)} error={errors.contactEmail} />
        <Input label="Tournament phone" type="tel" value={phone} onChange={e => onPhone(e.target.value)} />
      </div>
      <div className="space-y-3">
        {officials.map((o, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="grid @md:grid-cols-3 gap-3 flex-1">
              <Input label="Name" value={o.name} onChange={e => update(i, { name: e.target.value })} />
              <Input label="Role" placeholder="e.g. Rules official" value={o.role} onChange={e => update(i, { role: e.target.value })} />
              <Input label="Phone" type="tel" value={o.phone} onChange={e => update(i, { phone: e.target.value })} />
            </div>
            <RemoveRowButton label={`Remove ${o.name || 'official'}`} onClick={() => onChange(officials.filter((_, j) => j !== i))} />
          </div>
        ))}
      </div>
      <AddRowButton label="Add official" onClick={() => onChange([...officials, { name: '', role: '', phone: '' }])} />
    </FormSection>
  )
}
