import { Fragment, useEffect, useState, type ReactNode } from 'react'
import type { Official, Tournament } from './types'
import { Button, Input } from './components'
import { Textarea } from './admin/forms'
import { useApp } from './app-context'
import { getCourse } from './data'
import { upsertTournament } from './store'
import {
  PAYMENT_LABEL, addEntry, cardFor, entriesFor, groupsFor, leaderboard, moveToGroup, roundHoles, setCardState, teeSetIdFor, updateEntry,
  useLiveVersion, type Entry, type PaymentStatus,
} from './live'
import { divisionForGolfer, formatClock, formatMoney, toPar, withTax } from './golf'
import { ScoreCell } from './screens/Leaderboard'
import {
  ACTOR_LABEL, INCIDENT_KINDS, INVITE_PASSWORD, PACE_LABEL, STAFF_ROLE_LABEL, addIncidentNote, correctScore, incidentKindLabel,
  incidentsFor, logIncident, markerCardFor, markerOf, mismatches, paceFor, resolveIncident, scoreChangesFor, sendToCommittee,
  slotStatus, staffRoleOf, useOpsVersion,
  type Actor, type GroupPace, type Incident, type IncidentKind, type IncidentStatus, type PaceStatus, type SlotStatus,
} from './ops'

/*
 * Tournament-day panels shared by the organiser console and the marshal / official consoles.
 * Each panel takes the signed-in person as an Actor, so every action is recorded against them.
 */

/* ───────── Small pieces ───────── */

export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

const CHIP = 'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-bold font-display whitespace-nowrap'

const SLOT_STYLE: Record<SlotStatus, [string, string]> = {
  open: ['Open slot', 'bg-canvas text-gray-500'],
  invited: ['Invited', 'bg-amber-50 text-amber-700'],
  active: ['Signed in', 'bg-emerald-50 text-emerald-700'],
  ended: ['Access ended', 'bg-gray-100 text-gray-500'],
}
export function SlotChip({ status, invited }: { status: SlotStatus; invited?: boolean }) {
  const [label, cls] = SLOT_STYLE[status]
  return <span className={`${CHIP} ${cls}`}>{status === 'invited' && !invited ? 'Login not sent' : label}</span>
}

const PACE_STYLE: Record<PaceStatus, string> = {
  'not-started': 'bg-canvas text-gray-500',
  'on-pace': 'bg-emerald-50 text-emerald-700',
  behind: 'bg-amber-50 text-amber-700',
  'out-of-position': 'bg-rose-50 text-rose-700',
  finished: 'bg-gray-100 text-gray-500',
}
export const PaceChip = ({ status }: { status: PaceStatus }) => <span className={`${CHIP} ${PACE_STYLE[status]}`}>{PACE_LABEL[status]}</span>

const INCIDENT_STYLE: Record<IncidentStatus, [string, string]> = {
  open: ['On the course', 'bg-amber-50 text-amber-700'],
  committee: ['Needs a decision', 'bg-rose-50 text-rose-700'],
  resolved: ['Resolved', 'bg-emerald-50 text-emerald-700'],
}
export const IncidentChip = ({ status }: { status: IncidentStatus }) => <span className={`${CHIP} ${INCIDENT_STYLE[status][1]}`}>{INCIDENT_STYLE[status][0]}</span>

export function Panel({ title, subtitle, aside, children, flush }: { title: string; subtitle?: ReactNode; aside?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section className={`bg-white rounded-[28px] shadow-card ${flush ? 'overflow-hidden' : 'p-6'}`}>
      <div className={`flex flex-wrap items-start justify-between gap-3 ${flush ? 'px-6 pt-6 pb-3' : 'mb-4'}`}>
        <div className="min-w-0">
          <h2 className="font-display font-bold text-ink text-[19px] tracking-tight">{title}</h2>
          {subtitle && <p className="text-[12px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {aside && <div className="flex flex-wrap gap-2">{aside}</div>}
      </div>
      {children}
    </section>
  )
}

export function Modal({ title, subtitle, onClose, children, footer }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title"
          className="pointer-events-auto bg-white rounded-[28px] shadow-2xl w-full max-w-[520px] max-h-[calc(100vh-2rem)] flex flex-col fade-in-up">
          <div className="px-7 pt-7">
            <h3 id="modal-title" className="font-display font-bold text-ink text-[20px] tracking-tight">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{subtitle}</p>}
          </div>
          <div className="px-7 py-5 overflow-y-auto space-y-4">{children}</div>
          <div className="px-7 pb-7 flex gap-2.5">{footer}</div>
        </div>
      </div>
    </>
  )
}

function Chips<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-gray-600 font-display">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={String(o.value)} type="button" onClick={() => onChange(o.value)} aria-pressed={o.value === value}
            className={`h-9 px-3.5 rounded-full text-[13px] font-semibold font-display ${o.value === value ? 'bg-ink text-white' : 'bg-canvas text-gray-600 hover:bg-gray-200'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const SELECT = 'h-10 rounded-xl bg-canvas px-3 text-[13px] font-semibold text-ink border border-transparent focus:border-pine-400 focus:outline-none'

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'dark' | 'warn' }) {
  return (
    <div className={`rounded-[24px] p-5 ${tone === 'dark' ? 'bg-ink text-white' : tone === 'warn' ? 'bg-rose-50' : 'bg-white shadow-card'}`}>
      <p className={`text-[13px] font-semibold ${tone === 'dark' ? 'text-white/55' : tone === 'warn' ? 'text-rose-700' : 'text-gray-500'}`}>{label}</p>
      <p className={`font-display font-extrabold text-[30px] leading-tight ${tone === 'dark' ? 'text-lime-400' : tone === 'warn' ? 'text-rose-700' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
export function StatRow({ items }: { items: { label: string; value: ReactNode; tone?: 'dark' | 'warn' }[] }) {
  return <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">{items.map(i => <Stat key={i.label} {...i} />)}</div>
}

const names = (t: Tournament, ids: string[]) => {
  const field = entriesFor(t.id)
  return ids.map(id => field.find(e => e.id === id)?.name).filter(Boolean).join(', ')
}

/* ───────── Pace of play ───────── */

export function PaceBoard({ t, round, onLog, compact }: { t: Tournament; round: number; onLog?: (g: GroupPace) => void; compact?: boolean }) {
  useLiveVersion()
  const pace = paceFor(t, round)
  const flagged = pace.groups.filter(g => g.status === 'behind' || g.status === 'out-of-position')
  const list = compact ? flagged : pace.groups

  return (
    <Panel
      title={compact ? 'Groups needing attention' : 'Pace of play'}
      subtitle={<>Target {Math.floor((t.pace?.targetMinutes ?? 255) / 60)} h {(t.pace?.targetMinutes ?? 255) % 60} min · flag at {pace.flagMinutes} min behind · course clock {formatClock(pace.clock)}</>}
      aside={!compact && (
        <div className="flex gap-1.5">
          {(['on-pace', 'behind', 'out-of-position', 'finished'] as PaceStatus[]).map(s => (
            <span key={s} className={`${CHIP} ${PACE_STYLE[s]}`}>{pace.groups.filter(g => g.status === s).length} {PACE_LABEL[s].toLowerCase()}</span>
          ))}
        </div>
      )}
    >
      {list.length === 0 ? (
        <p className="text-[14px] text-gray-500 py-6 text-center">{compact ? 'Every group is on pace.' : 'No groups yet — the tee sheet hasn’t been built.'}</p>
      ) : (
        <ul className="divide-y divide-black/[0.05]">
          {list.map(g => (
            <li key={g.group.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="w-[74px] flex-shrink-0">
                <span className="block font-display font-extrabold text-ink text-[15px]">{formatClock(g.group.time)}</span>
                <span className="block text-[11px] text-gray-500">Tee {g.group.startHole}</span>
              </span>
              <span className="w-16 flex-shrink-0 text-center">
                <span className="block font-display font-extrabold text-ink text-[20px] leading-none">{g.onHole ?? (g.status === 'finished' ? 'F' : '–')}</span>
                <span className="block text-[10px] text-gray-400 font-semibold mt-0.5">{g.onHole ? 'ON HOLE' : g.status === 'finished' ? 'DONE' : 'NOT OUT'}</span>
              </span>
              <span className="flex-1 min-w-[180px] text-[13px] text-gray-600 leading-relaxed">
                {g.players.map(p => p.name).join(' · ')}
                {g.status === 'out-of-position' && <span className="block text-[12px] text-rose-700 font-semibold">Empty hole in front of them ({g.gapHoles} holes behind the group ahead)</span>}
              </span>
              <span className="flex items-center gap-2 ml-auto">
                {g.behindMinutes > 0 && g.status !== 'finished' && <span className="text-[13px] font-bold text-ink">+{g.behindMinutes} min</span>}
                <PaceChip status={g.status} />
                {onLog && (g.status === 'behind' || g.status === 'out-of-position') && (
                  <Button size="sm" variant="secondary" onClick={() => onLog(g)}>Log warning</Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!compact && (
        <div className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-[12px] text-gray-500 leading-relaxed">
          <span className="font-bold text-ink">Cart GPS (TagMarshal): not connected.</span> Positions come from the scores golfers enter. With cart tags,
          this shows live positions, and alerts when a cart enters a no-cart zone.
        </div>
      )}
    </Panel>
  )
}

/* ───────── Incidents ───────── */

interface IncidentPreset { kind?: IncidentKind; hole?: number; entryIds?: string[]; note?: string }

export function IncidentForm({ t, round, actor, preset, onClose }: { t: Tournament; round: number; actor: Actor; preset?: IncidentPreset; onClose: () => void }) {
  const { showToast } = useApp()
  const course = getCourse(t.courseId)
  const holes = course ? roundHoles(t, course, round) : []
  const groups = groupsFor(t.id, round)
  const field = entriesFor(t.id).filter(e => e.status === 'registered')
  const [kind, setKind] = useState<IncidentKind>(preset?.kind ?? 'slow-play')
  const [hole, setHole] = useState<number | ''>(preset?.hole ?? '')
  const [groupId, setGroupId] = useState(() => groups.find(g => preset?.entryIds?.some(id => g.entryIds.includes(id)))?.id ?? '')
  const [entryIds, setEntryIds] = useState<string[]>(preset?.entryIds ?? [])
  const [note, setNote] = useState(preset?.note ?? '')
  const [error, setError] = useState('')
  const players = groupId ? field.filter(e => groups.find(g => g.id === groupId)?.entryIds.includes(e.id)) : field
  const canEscalate = actor.role === 'marshal' || actor.role === 'golfer'

  function save(status: IncidentStatus) {
    if (!note.trim()) return setError('Say what happened')
    logIncident({ tournamentId: t.id, round, kind, hole: hole === '' ? undefined : hole, entryIds, note, raisedBy: actor, status })
    showToast(status === 'committee' ? 'Logged and sent to the committee' : 'Incident logged')
    onClose()
  }

  return (
    <Modal title="Log an incident" subtitle="Recorded with your name and the time. Players aren’t notified." onClose={onClose}
      footer={<>
        <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
        {canEscalate && <Button variant="secondary" fullWidth onClick={() => save('committee')}>Send to committee</Button>}
        <Button fullWidth onClick={() => save('open')}>Log it</Button>
      </>}>
      <Chips label="What happened" options={INCIDENT_KINDS.map(k => ({ value: k.value, label: k.label }))} value={kind} onChange={setKind} />
      <p className="text-[12px] text-gray-500 -mt-2">{INCIDENT_KINDS.find(k => k.value === kind)?.hint}</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-gray-600 font-display">Hole</span>
          <select className={SELECT} value={hole} onChange={e => setHole(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Not on a hole</option>
            {holes.map(h => <option key={h.hole} value={h.hole}>Hole {h.hole}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-gray-600 font-display">Group</span>
          <select className={SELECT} value={groupId} onChange={e => { setGroupId(e.target.value); setEntryIds([]) }}>
            <option value="">Any group</option>
            {groups.map(g => <option key={g.id} value={g.id}>{formatClock(g.time)} · tee {g.startHole}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-gray-600 font-display">Players involved</span>
        <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
          {players.map(p => {
            const on = entryIds.includes(p.id)
            return (
              <button key={p.id} type="button" aria-pressed={on} onClick={() => setEntryIds(on ? entryIds.filter(x => x !== p.id) : [...entryIds, p.id])}
                className={`h-8 px-3 rounded-full text-[12px] font-semibold ${on ? 'bg-lime-400 text-ink' : 'bg-canvas text-gray-600 hover:bg-gray-200'}`}>{p.name}</button>
            )
          })}
        </div>
      </div>
      <Textarea label="What happened" placeholder="e.g. Cart 16 driven onto the apron of the 4th green" value={note} error={error}
        onChange={e => { setNote(e.target.value); setError('') }} style={{ minHeight: 90 }} />
    </Modal>
  )
}

function DecisionModal({ t, incident, actor, onClose }: { t: Tournament; incident: Incident; actor: Actor; onClose: () => void }) {
  const { showToast } = useApp()
  const course = getCourse(t.courseId)
  const holes = course ? roundHoles(t, course, incident.round) : []
  const committee = actor.role !== 'marshal'
  const [decision, setDecision] = useState('')
  const [changeScore, setChangeScore] = useState(incident.kind === 'score-dispute' && committee)
  const [entryId, setEntryId] = useState(incident.entryIds[0] ?? '')
  const [holeIndex, setHoleIndex] = useState(Math.max(0, holes.findIndex(h => h.hole === incident.hole)))
  const current = entryId ? cardFor(t, entryId, incident.round)[holeIndex] : null
  const marked = entryId ? markerCardFor(t, entryId, incident.round)[holeIndex] : null
  const [strokes, setStrokesValue] = useState<number | ''>(marked ?? current ?? '')
  const [error, setError] = useState('')

  function save() {
    if (!decision.trim()) return setError('Record the decision')
    const change = changeScore && entryId && strokes !== '' ? { t, entryId, holeIndex, strokes } : undefined
    resolveIncident(incident.id, actor, decision, change)
    showToast(change ? 'Decision recorded and the score updated' : 'Decision recorded')
    onClose()
  }

  return (
    <Modal title={committee ? 'Committee decision' : 'Handled on the course'} onClose={onClose}
      subtitle={committee ? 'The decision is final for this tournament and kept with the scorecard.' : 'Say what you did. If it needs a ruling on a score, send it to the committee instead.'}
      footer={<><Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button><Button fullWidth onClick={save}>Save decision</Button></>}>
      <div className="rounded-2xl bg-canvas px-4 py-3 text-[13px] text-gray-600 leading-relaxed">
        <span className="font-bold text-ink">{incidentKindLabel(incident.kind)}{incident.hole ? ` · hole ${incident.hole}` : ''}</span> — {incident.note}
      </div>
      <Textarea label="Decision" placeholder={committee ? 'e.g. Ball moved while addressing it in the bunker: one-stroke penalty, 6 on the 3rd.' : 'e.g. Warned the group; back in position by the next tee.'}
        value={decision} error={error} onChange={e => { setDecision(e.target.value); setError('') }} style={{ minHeight: 90 }} />
      {committee && incident.entryIds.length > 0 && (
        <div className="rounded-2xl ring-1 ring-black/[0.06] p-4 space-y-3">
          <label className="flex items-center gap-2.5 text-[14px] font-semibold text-ink font-display">
            <input type="checkbox" checked={changeScore} onChange={e => setChangeScore(e.target.checked)} className="w-4 h-4 accent-[var(--color-ink)]" />
            Change a score because of this decision
          </label>
          {changeScore && (
            <div className="grid grid-cols-3 gap-2">
              <select aria-label="Player" className={SELECT} value={entryId} onChange={e => setEntryId(e.target.value)}>
                {incident.entryIds.map(id => <option key={id} value={id}>{names(t, [id])}</option>)}
              </select>
              <select aria-label="Hole" className={SELECT} value={holeIndex} onChange={e => setHoleIndex(Number(e.target.value))}>
                {holes.map((h, i) => <option key={h.hole} value={i}>Hole {h.hole}</option>)}
              </select>
              <input aria-label="Strokes" type="number" min={1} max={15} value={strokes} onChange={e => setStrokesValue(e.target.value === '' ? '' : Number(e.target.value))}
                className={`${SELECT} text-center`} />
              <p className="col-span-3 text-[12px] text-gray-500">Card now shows {current ?? '–'}{marked !== null && marked !== current ? `; the marker recorded ${marked}` : ''}. The change is added to the audit trail.</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function NoteModal({ title, placeholder, onSave, onClose }: { title: string; placeholder: string; onSave: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState('')
  return (
    <Modal title={title} onClose={onClose}
      footer={<><Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button><Button fullWidth disabled={!text.trim()} onClick={() => { onSave(text); onClose() }}>Save</Button></>}>
      <Textarea label="Note" placeholder={placeholder} value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 90 }} />
    </Modal>
  )
}

type IncidentFilter = 'active' | 'committee' | 'resolved' | 'all'

export function IncidentsBoard({ t, round, actor, canAct = true }: { t: Tournament; round: number; actor: Actor; canAct?: boolean }) {
  useOpsVersion()
  useLiveVersion()
  const { showToast } = useApp()
  const committee = actor.role !== 'marshal'
  const all = incidentsFor(t.id)
  const [filter, setFilter] = useState<IncidentFilter>(committee && all.some(i => i.status === 'committee') ? 'committee' : 'active')
  const [logging, setLogging] = useState(false)
  const [deciding, setDeciding] = useState<Incident | null>(null)
  const [noting, setNoting] = useState<{ incident: Incident; escalate: boolean } | null>(null)
  const counts: Record<IncidentFilter, number> = {
    active: all.filter(i => i.status !== 'resolved').length,
    committee: all.filter(i => i.status === 'committee').length,
    resolved: all.filter(i => i.status === 'resolved').length,
    all: all.length,
  }
  const list = all.filter(i => filter === 'all' || (filter === 'active' ? i.status !== 'resolved' : i.status === filter))
  const canLog = canAct && t.status === 'in-progress'

  return (
    <Panel title={committee ? 'Disputes & incidents' : 'Incidents'}
      subtitle={committee ? 'Rulings and score disputes come here from marshals and golfers. Decisions are recorded with your name.' : 'Log anything that happens on the course. Send rulings and score disputes to the committee.'}
      aside={canLog && <Button size="sm" onClick={() => setLogging(true)}>Log incident</Button>}>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {([['active', 'Open'], ['committee', 'Needs a decision'], ['resolved', 'Resolved'], ['all', 'All']] as [IncidentFilter, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)} aria-pressed={filter === v}
            className={`h-9 px-3.5 rounded-full text-[13px] font-semibold font-display ${filter === v ? 'bg-ink text-white' : 'bg-canvas text-gray-600 hover:bg-gray-200'}`}>
            {label} <span className="opacity-60">{counts[v]}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? <p className="text-[14px] text-gray-500 py-6 text-center">Nothing here.</p> : (
        <ul className="space-y-3">
          {list.map(i => (
            <li key={i.id} className="rounded-2xl ring-1 ring-black/[0.06] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold text-ink text-[15px]">{incidentKindLabel(i.kind)}</span>
                {i.hole && <span className={`${CHIP} bg-canvas text-ink`}>Hole {i.hole}</span>}
                <IncidentChip status={i.status} />
                <span className="ml-auto text-[12px] text-gray-500">{fmtTime(i.at)} · {i.raisedBy.name} ({ACTOR_LABEL[i.raisedBy.role].toLowerCase()})</span>
              </div>
              {i.entryIds.length > 0 && <p className="text-[12px] font-semibold text-pine-700 mt-1.5">{names(t, i.entryIds)}</p>}
              <p className="text-[14px] text-gray-700 mt-1.5 leading-relaxed">{i.note}</p>
              {i.updates.map((u, k) => (
                <p key={k} className="text-[13px] text-gray-600 mt-2 pl-3 border-l-2 border-black/10 leading-relaxed">
                  <span className="font-semibold text-ink">{u.by.name}</span> <span className="text-gray-400">{fmtTime(u.at)}</span> — {u.text}
                </p>
              ))}
              {i.status === 'resolved' && i.decision && (
                <div className="mt-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-900 leading-relaxed">
                  <span className="font-bold">Decision</span> · {i.decidedBy?.name} ({ACTOR_LABEL[i.decidedBy?.role ?? 'official'].toLowerCase()}) {i.decidedAt ? fmtTime(i.decidedAt) : ''} — {i.decision}
                  {i.scoreChangeIds?.length ? <span className="block text-[12px] mt-1">Score changed — see Score changes.</span> : null}
                </div>
              )}
              {canAct && i.status !== 'resolved' && t.status === 'in-progress' && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {committee
                    ? <Button size="sm" onClick={() => setDeciding(i)}>Decide</Button>
                    : <>
                        {i.status === 'open' && <Button size="sm" onClick={() => setDeciding(i)}>Handled on the course</Button>}
                        {i.status === 'open' && <Button size="sm" variant="secondary" onClick={() => setNoting({ incident: i, escalate: true })}>Send to committee</Button>}
                      </>}
                  <Button size="sm" variant="ghost" onClick={() => setNoting({ incident: i, escalate: false })}>Add note</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {logging && <IncidentForm t={t} round={round} actor={actor} onClose={() => setLogging(false)} />}
      {deciding && <DecisionModal t={t} incident={deciding} actor={actor} onClose={() => setDeciding(null)} />}
      {noting && (
        <NoteModal title={noting.escalate ? 'Send to the committee' : 'Add a note'} placeholder={noting.escalate ? 'What the committee needs to know' : 'What happened next'}
          onClose={() => setNoting(null)}
          onSave={text => {
            if (noting.escalate) { sendToCommittee(noting.incident.id, actor, text); showToast('Sent to the committee') }
            else addIncidentNote(noting.incident.id, actor, text)
          }} />
      )}
    </Panel>
  )
}

/* ───────── Scorecards ───────── */

function CorrectionModal({ t, entry, round, holeIndex, actor, onClose }: { t: Tournament; entry: Entry; round: number; holeIndex: number; actor: Actor; onClose: () => void }) {
  const { showToast } = useApp()
  const course = getCourse(t.courseId)
  const hole = course ? roundHoles(t, course, round)[holeIndex] : undefined
  const current = cardFor(t, entry.id, round)[holeIndex]
  const marked = markerCardFor(t, entry.id, round)[holeIndex]
  const [strokes, setValue] = useState<number | ''>(marked !== null && marked !== current ? marked : current ?? '')
  const [reason, setReason] = useState(marked !== null && marked !== current ? 'Marker’s score confirmed' : '')
  const [error, setError] = useState('')

  function save() {
    if (strokes === '' || strokes < 1 || strokes > 15) return setError('Enter 1–15 strokes')
    if (!reason.trim()) return setError('A reason is required — it goes in the audit trail')
    const c = correctScore(t, entry.id, round, holeIndex, strokes, reason, actor)
    showToast(c ? `Hole ${hole?.hole}: ${current ?? '–'} → ${strokes} for ${entry.name}` : 'No change')
    onClose()
  }

  return (
    <Modal title={`Correct hole ${hole?.hole ?? holeIndex + 1} · ${entry.name}`} subtitle="Every correction is kept with who made it, when and why." onClose={onClose}
      footer={<><Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button><Button fullWidth onClick={save}>Save correction</Button></>}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-canvas py-3"><p className="text-[11px] font-semibold text-gray-500">Player entered</p><p className="font-display font-extrabold text-[24px] text-ink">{current ?? '–'}</p></div>
        <div className="rounded-2xl bg-canvas py-3"><p className="text-[11px] font-semibold text-gray-500">Marker recorded</p><p className="font-display font-extrabold text-[24px] text-ink">{marked ?? '–'}</p></div>
        <div className="rounded-2xl bg-lime-400/40 py-3"><p className="text-[11px] font-semibold text-pine-800">Par {hole?.par}</p>
          <input aria-label="Correct strokes" type="number" min={1} max={15} value={strokes} onChange={e => { setValue(e.target.value === '' ? '' : Number(e.target.value)); setError('') }}
            className="w-16 h-9 mt-0.5 rounded-xl bg-white text-center font-display font-extrabold text-[20px]" />
        </div>
      </div>
      <Input label="Reason *" placeholder="e.g. Marker’s score confirmed after speaking to the group" value={reason} error={error} onChange={e => { setReason(e.target.value); setError('') }} />
    </Modal>
  )
}

type CardFilter = 'all' | 'attention' | 'verified'

export function ScorecardsBoard({ t, round, actor, canManage }: { t: Tournament; round: number; actor: Actor; canManage: boolean }) {
  useLiveVersion()
  useOpsVersion()
  const { showToast } = useApp()
  const course = getCourse(t.courseId)
  const holes = course ? roundHoles(t, course, round) : []
  const rows = leaderboard(t, round)
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<CardFilter>('attention')
  const [correcting, setCorrecting] = useState<{ entry: Entry; holeIndex: number } | null>(null)
  // Closed tournaments can't be reopened in the system (client answer T-14)
  const closed = t.status === 'completed' || t.status === 'cancelled'
  const editable = canManage && !closed

  const needsAttention = (entryId: string, state: string) => mismatches(t, entryId, round).length > 0 || state === 'submitted'
  const shown = rows.filter(r => filter === 'all' || (filter === 'verified' ? r.state === 'verified' : needsAttention(r.entry.id, r.state)))
  const counts = { all: rows.length, attention: rows.filter(r => needsAttention(r.entry.id, r.state)).length, verified: rows.filter(r => r.state === 'verified').length }

  return (
    <Panel flush title="Scorecards" subtitle={closed ? 'This tournament is closed — scorecards are final.' : 'Each card is checked against the marker’s record. Correct with a reason, then verify.'}
      aside={
        <div className="flex gap-1.5">
          {([['attention', 'Needs attention'], ['verified', 'Verified'], ['all', 'All']] as [CardFilter, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setFilter(v)} aria-pressed={filter === v}
              className={`h-9 px-3.5 rounded-full text-[13px] font-semibold font-display ${filter === v ? 'bg-ink text-white' : 'bg-canvas text-gray-600 hover:bg-gray-200'}`}>
              {label} <span className="opacity-60">{counts[v]}</span>
            </button>
          ))}
        </div>
      }>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[640px]">
          <thead>
            <tr className="text-[12px] font-bold font-display text-gray-400 border-y border-black/[0.05]">
              <th className="py-2.5 pl-6 pr-2">Pos</th>
              <th className="py-2.5 px-2">Player</th>
              <th className="py-2.5 px-2 text-right">Gross</th>
              <th className="py-2.5 px-2 text-right">Net</th>
              <th className="py-2.5 px-2 text-right">Thru</th>
              <th className="py-2.5 px-2">Marker check</th>
              <th className="py-2.5 pl-2 pr-6 text-right">Card</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(r => {
              const isOpen = open === r.entry.id
              const card = cardFor(t, r.entry.id, round)
              const marked = markerCardFor(t, r.entry.id, round)
              const diff = mismatches(t, r.entry.id, round)
              const marker = markerOf(t.id, round, r.entry.id)
              const blanks = card.filter(s => s === null).length
              const state = r.state
              return (
                <Fragment key={r.entry.id}>
                  <tr onClick={() => setOpen(isOpen ? null : r.entry.id)} className={`border-b border-black/[0.05] cursor-pointer hover:bg-canvas/60 ${isOpen ? 'bg-canvas/60' : ''}`}>
                    <td className="py-3 pl-6 pr-2 font-display font-extrabold text-ink">{r.position}</td>
                    <td className="py-3 px-2 text-[14px] font-semibold text-ink">{r.entry.name}</td>
                    <td className="py-3 px-2 text-right font-display font-bold">{r.thru ? toPar(r.grossToPar) : '–'}</td>
                    <td className="py-3 px-2 text-right text-[13px] text-gray-600">{r.thru ? toPar(r.netToPar) : '–'}</td>
                    <td className="py-3 px-2 text-right text-[13px] text-gray-600">{r.thru === r.holes ? 'F' : r.thru}</td>
                    <td className="py-3 px-2">
                      {diff.length ? <span className={`${CHIP} bg-rose-50 text-rose-700`}>{diff.length} hole{diff.length > 1 ? 's' : ''} differ</span>
                        : r.thru ? <span className={`${CHIP} bg-emerald-50 text-emerald-700`}>Agrees</span> : <span className="text-[12px] text-gray-400">—</span>}
                    </td>
                    <td className="py-3 pl-2 pr-6 text-right">
                      <span className={`${CHIP} ${state === 'verified' ? 'bg-emerald-50 text-emerald-700' : state === 'submitted' ? 'bg-amber-50 text-amber-700' : 'bg-canvas text-gray-500'}`}>
                        {state === 'verified' ? 'Verified' : state === 'submitted' ? 'Submitted' : 'Playing'}
                      </span>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-canvas/60 border-b border-black/[0.05]">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="overflow-x-auto">
                          <table className="text-center text-[12px]">
                            <tbody>
                              <tr>
                                <td className="pr-3 text-left text-[11px] font-bold text-gray-400 whitespace-nowrap">Hole</td>
                                {holes.map(h => <td key={h.hole} className="w-9 text-[11px] font-bold text-gray-400">{h.hole}</td>)}
                              </tr>
                              <tr>
                                <td className="pr-3 text-left text-[12px] font-semibold text-ink whitespace-nowrap">Player</td>
                                {holes.map((h, i) => (
                                  <td key={h.hole} className="py-0.5">
                                    {editable && state !== 'verified'
                                      ? <button onClick={() => setCorrecting({ entry: r.entry, holeIndex: i })} aria-label={`Correct hole ${h.hole}`}
                                          className={`rounded-lg hover:ring-2 hover:ring-pine-400 ${diff.includes(i) ? 'ring-2 ring-rose-400' : ''}`}><ScoreCell strokes={card[i]} par={h.par} /></button>
                                      : <span className={diff.includes(i) ? 'inline-block rounded-lg ring-2 ring-rose-400' : ''}><ScoreCell strokes={card[i]} par={h.par} /></span>}
                                  </td>
                                ))}
                              </tr>
                              <tr>
                                <td className="pr-3 text-left text-[12px] font-semibold text-gray-500 whitespace-nowrap">Marker{marker ? ` (${marker.name.split(' ')[0]})` : ''}</td>
                                {holes.map((h, i) => <td key={h.hole} className={`py-0.5 text-[13px] font-semibold ${diff.includes(i) ? 'text-rose-600' : 'text-gray-400'}`}>{marked[i] ?? '·'}</td>)}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {editable && state !== 'verified' && (
                            <Button size="sm" disabled={diff.length > 0} onClick={() => { setCardState(t.id, r.entry.id, round, 'verified'); showToast(`${r.entry.name}'s card verified`) }}>Verify card</Button>
                          )}
                          {editable && state === 'verified' && (
                            <Button size="sm" variant="secondary" onClick={() => { setCardState(t.id, r.entry.id, round, 'submitted'); showToast('Card unlocked for corrections', 'info') }}>Unlock to correct</Button>
                          )}
                          <span className="text-[12px] text-gray-500">
                            {diff.length ? 'Settle the red holes first: click a score to correct it.'
                              : blanks && state === 'submitted' ? `Submitted with ${blanks} blank hole${blanks > 1 ? 's' : ''} — the player is responsible for the card as entered.`
                              : editable && state !== 'verified' ? 'Click any score to correct it.' : ''}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && <p className="text-[14px] text-gray-500 py-8 text-center">{filter === 'attention' ? 'Nothing needs attention right now.' : 'No cards yet.'}</p>}
      {correcting && <CorrectionModal t={t} entry={correcting.entry} round={round} holeIndex={correcting.holeIndex} actor={actor} onClose={() => setCorrecting(null)} />}
    </Panel>
  )
}

/* ───────── Score changes ───────── */

export function ScoreChangesLog({ t }: { t: Tournament }) {
  useOpsVersion()
  const changes = scoreChangesFor(t.id)
  return (
    <Panel flush title="Score changes" subtitle="Every score changed after it was entered: who, when, why. Kept for the record after the tournament closes.">
      {changes.length === 0 ? <p className="text-[14px] text-gray-500 px-6 pb-8 pt-2">No scores have been changed.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="text-[12px] font-bold font-display text-gray-400 border-y border-black/[0.05]">
                <th className="py-2.5 pl-6 pr-2">When</th><th className="py-2.5 px-2">Player</th><th className="py-2.5 px-2">Hole</th>
                <th className="py-2.5 px-2">Change</th><th className="py-2.5 px-2">Reason</th><th className="py-2.5 pl-2 pr-6">By</th>
              </tr>
            </thead>
            <tbody>
              {changes.map(c => (
                <tr key={c.id} className="border-b border-black/[0.05] text-[13px] align-top">
                  <td className="py-3 pl-6 pr-2 text-gray-500 whitespace-nowrap">{fmtTime(c.at)}</td>
                  <td className="py-3 px-2 font-semibold text-ink">{names(t, [c.entryId])}</td>
                  <td className="py-3 px-2">{c.hole}</td>
                  <td className="py-3 px-2 font-display font-bold whitespace-nowrap">{c.from ?? '–'} → {c.to ?? '–'}</td>
                  <td className="py-3 px-2 text-gray-600">{c.reason}{c.incidentId && <span className={`${CHIP} bg-canvas text-gray-600 ml-1.5`}>From a dispute</span>}</td>
                  <td className="py-3 pl-2 pr-6 text-gray-600 whitespace-nowrap">{c.by.name}<span className="block text-[11px] text-gray-400">{ACTOR_LABEL[c.by.role]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

/* ───────── Tee sheet and contacts ───────── */

export function TeeSheetBoard({ t, round }: { t: Tournament; round: number }) {
  useLiveVersion()
  const groups = groupsFor(t.id, round)
  const field = entriesFor(t.id)
  const contacts = (t.officials ?? []).filter(o => o.name.trim())
  return (
    <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 items-start">
      <Panel title={`Tee sheet · round ${round}`} subtitle={t.teeSheet?.startType === 'shotgun' ? 'Shotgun start' : `Every ${t.teeSheet?.intervalMinutes} min from ${formatClock(t.teeSheet?.firstTeeTime ?? '08:00')}`}>
        {groups.length === 0 ? <p className="text-[14px] text-gray-500 py-6 text-center">The organiser hasn’t built the tee sheet yet.</p> : (
          <ul className="divide-y divide-black/[0.05]">
            {groups.map(g => (
              <li key={g.id} className="flex gap-4 py-3">
                <span className="w-20 flex-shrink-0">
                  <span className="block font-display font-extrabold text-ink text-[15px]">{formatClock(g.time)}</span>
                  <span className="block text-[12px] text-gray-500">Hole {g.startHole}</span>
                </span>
                <span className="text-[13px] text-gray-600 leading-relaxed">{g.entryIds.map(id => field.find(e => e.id === id)?.name).filter(Boolean).join(' · ')}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Contacts" subtitle="Organisers, marshals and officials for this tournament">
        <ul className="space-y-3">
          {contacts.map((o, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span><span className="block text-[14px] font-semibold text-ink">{o.name}</span><span className="block text-[12px] text-gray-500">{o.role}</span></span>
              {o.phone && <a href={`tel:${o.phone}`} className="h-9 px-3.5 rounded-full bg-canvas text-[12px] font-bold font-display text-ink inline-flex items-center hover:bg-gray-200">{o.phone}</a>}
            </li>
          ))}
          {t.contactPhone && (
            <li className="flex items-center justify-between gap-3 pt-3 border-t border-black/[0.05]">
              <span><span className="block text-[14px] font-semibold text-ink">Tournament office</span><span className="block text-[12px] text-gray-500">{t.contactEmail}</span></span>
              <a href={`tel:${t.contactPhone}`} className="h-9 px-3.5 rounded-full bg-canvas text-[12px] font-bold font-display text-ink inline-flex items-center hover:bg-gray-200">{t.contactPhone}</a>
            </li>
          )}
        </ul>
      </Panel>
    </div>
  )
}

/* ───────── Field (organiser) ───────── */

function ReplaceModal({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const { showToast } = useApp()
  const [name, setName] = useState('')
  const [index, setIndex] = useState('')
  const [error, setError] = useState('')
  function save() {
    const hi = Number(index)
    if (!name.trim()) return setError('Enter the new player’s name')
    if (index === '' || Number.isNaN(hi) || hi < -10 || hi > 54) return setError('Handicap Index between +10 and 54')
    updateEntry(entry.id, { name: name.trim(), handicapIndex: hi })
    showToast(`${entry.name} replaced by ${name.trim()}`)
    onClose()
  }
  return (
    <Modal title={`Replace ${entry.name}`} subtitle="The new player takes the same spot, group, team and tee time." onClose={onClose}
      footer={<><Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button><Button fullWidth onClick={save}>Replace player</Button></>}>
      <Input label="New player’s name" value={name} onChange={e => { setName(e.target.value); setError('') }} />
      <Input label="Handicap Index" type="number" step="0.1" value={index} error={error} onChange={e => { setIndex(e.target.value); setError('') }} />
    </Modal>
  )
}

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The organiser registers a golfer on their behalf (client, 17 Oct) */
function RegisterGolferModal({ t, onClose }: { t: Tournament; onClose: () => void }) {
  const { showToast } = useApp()
  const course = getCourse(t.courseId)
  const divisions = t.divisions ?? []
  const fees = t.fees
  const fee = fees ? withTax(fees.amount, fees) : 0
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', index: '', gender: 'men' as 'men' | 'women', divisionId: '', teeSetId: '', payment: (fee > 0 ? 'pay-at-course' : 'free') as PaymentStatus, notify: true })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (patch: Partial<typeof form>) => { setForm(f => ({ ...f, ...patch })); setErrors({}) }
  const hi = Number(form.index)
  const suggested = form.index !== '' && !Number.isNaN(hi) ? divisionForGolfer(divisions, { index: hi, gender: form.gender }) : undefined
  const divisionId = form.divisionId || suggested?.id || ''
  const division = divisions.find(d => d.id === divisionId)

  function save() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'First name is required'
    if (!form.lastName.trim()) e.lastName = 'Last name is required'
    if (!EMAIL_OK.test(form.email.trim())) e.email = 'Enter a valid email — the golfer gets their confirmation here'
    if (form.index === '' || Number.isNaN(hi) || hi < -10 || hi > 54) e.index = 'Handicap Index between +10 and 54'
    else if (t.scoring?.maxHandicap !== undefined && hi > t.scoring.maxHandicap) e.index = `Above this tournament's maximum (${t.scoring.maxHandicap})`
    if (!divisionId) e.divisionId = 'Choose a division'
    if (Object.keys(e).length) return setErrors(e)
    const r = addEntry(t, { firstName: form.firstName, lastName: form.lastName, email: form.email, handicapIndex: hi, gender: form.gender, divisionId, teeSetId: form.teeSetId || undefined, paymentStatus: form.payment })
    if (!r.ok) return setErrors({ [r.field === 'email' ? 'email' : 'form']: r.error })
    showToast(`${r.entry.name} registered${form.notify ? ` — confirmation sent to ${r.entry.email}` : ''}`)
    onClose()
  }

  const payOptions: { value: PaymentStatus; label: string }[] = fee > 0
    ? [{ value: 'pay-at-course', label: 'Pay at course' }, { value: 'link-sent', label: 'Email a payment link' }, { value: 'paid', label: 'Already paid' }, { value: 'waived', label: 'Waive the fee' }]
    : [{ value: 'free', label: 'Free entry' }]

  return (
    <Modal title="Register a golfer" subtitle={`Adds them to ${t.name}. Same rules as golfers registering themselves: one entry each, no waiting list.`} onClose={onClose}
      footer={<><Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button><Button fullWidth onClick={save}>Register golfer</Button></>}>
      {errors.form && <p className="rounded-2xl bg-rose-50 text-rose-700 text-[13px] font-semibold px-4 py-3">{errors.form}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Input label="First name" value={form.firstName} error={errors.firstName} onChange={e => set({ firstName: e.target.value })} />
        <Input label="Last name" value={form.lastName} error={errors.lastName} onChange={e => set({ lastName: e.target.value })} />
      </div>
      <Input label="Email" type="email" value={form.email} error={errors.email} onChange={e => set({ email: e.target.value })}
        hint="If they already have an account the entry is linked to it; otherwise they're invited to create one." />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Handicap Index" inputMode="decimal" placeholder="e.g. 12.4" value={form.index} error={errors.index} onChange={e => set({ index: e.target.value, divisionId: '' })} />
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-gray-600 font-display">Tee ratings</span>
          <select className={SELECT} value={form.gender} onChange={e => set({ gender: e.target.value as 'men' | 'women', divisionId: '' })}>
            <option value="men">Men's</option><option value="women">Women's</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-gray-600 font-display">Division</span>
          <select className={SELECT} value={divisionId} onChange={e => set({ divisionId: e.target.value })}>
            <option value="">{suggested ? '' : 'Choose…'}</option>
            {divisions.map(d => <option key={d.id} value={d.id}>{d.name}{d.id === suggested?.id ? ' (matches)' : ''}</option>)}
          </select>
          {errors.divisionId && <span className="text-xs text-red-500 font-medium">{errors.divisionId}</span>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-gray-600 font-display">Tees</span>
          <select className={SELECT} value={form.teeSetId} onChange={e => set({ teeSetId: e.target.value })}>
            <option value="">{division ? `Division's (${course?.teeSets?.find(ts => ts.id === division.teeSetId)?.name ?? '—'})` : 'Division\'s tees'}</option>
            {course?.teeSets?.map(ts => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-gray-600 font-display">Payment{fee > 0 && fees ? ` · ${formatMoney(fee, fees.currency)}` : ''}</span>
        <div className="flex flex-wrap gap-1.5">
          {payOptions.map(o => (
            <button key={o.value} type="button" aria-pressed={form.payment === o.value} onClick={() => set({ payment: o.value })}
              className={`h-9 px-3.5 rounded-full text-[13px] font-semibold font-display ${form.payment === o.value ? 'bg-ink text-white' : 'bg-canvas text-gray-600 hover:bg-gray-200'}`}>{o.label}</button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2.5 text-[14px] font-semibold text-ink font-display">
        <input type="checkbox" checked={form.notify} onChange={e => set({ notify: e.target.checked })} className="w-4 h-4 accent-[var(--color-ink)]" />
        Email the golfer a confirmation
      </label>
    </Modal>
  )
}

export function FieldBoard({ t, round }: { t: Tournament; round: number }) {
  useLiveVersion()
  const { showDialog, showToast } = useApp()
  const course = getCourse(t.courseId)
  const field = entriesFor(t.id).filter(e => e.status === 'registered')
  const groups = groupsFor(t.id, round)
  const [replacing, setReplacing] = useState<Entry | null>(null)
  const [adding, setAdding] = useState(false)
  const closed = t.status === 'completed' || t.status === 'cancelled'
  const players = Math.max(t.players, field.length)
  const full = players >= t.maxPlayers

  return (
    <Panel flush title={`Field · ${players} / ${t.maxPlayers}`}
      subtitle="Register golfers yourself, remove or replace players, move them between groups, or change their tees. A player keeps the same tees once they’ve teed off."
      aside={!closed && (
        <span className="flex items-center gap-2">
          {full && <span className="text-[12px] font-semibold text-rose-700">Field is full</span>}
          <Button size="sm" disabled={full} onClick={() => setAdding(true)}>Register a golfer</Button>
        </span>
      )}>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[820px]">
          <thead>
            <tr className="text-[12px] font-bold font-display text-gray-400 border-y border-black/[0.05]">
              <th className="py-2.5 pl-6 pr-2">Player</th><th className="py-2.5 px-2">HI</th><th className="py-2.5 px-2">Division</th>
              <th className="py-2.5 px-2">Entry</th>
              <th className="py-2.5 px-2">Tees</th><th className="py-2.5 px-2">Group</th><th className="py-2.5 pl-2 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {field.map(e => {
              const started = cardFor(t, e.id, round).some(s => s !== null)
              const group = groups.find(g => g.entryIds.includes(e.id))
              return (
                <tr key={e.id} className="border-b border-black/[0.05] text-[13px]">
                  <td className="py-2.5 pl-6 pr-2 font-semibold text-ink">{e.name}{e.isMe && <span className={`${CHIP} bg-lime-400/40 text-ink ml-1.5`}>Demo golfer</span>}</td>
                  <td className="py-2.5 px-2">{e.handicapIndex.toFixed(1)}</td>
                  <td className="py-2.5 px-2 text-gray-600">{t.divisions?.find(d => d.id === e.divisionId)?.name ?? '—'}</td>
                  <td className="py-2.5 px-2 whitespace-nowrap">
                    <span className="block text-[12px] font-semibold text-ink">{e.registeredBy === 'organiser' ? 'By organiser' : 'Online'}</span>
                    <span className="block text-[11px] text-gray-500">{PAYMENT_LABEL[e.paymentStatus ?? 'paid']}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <select aria-label={`Tees for ${e.name}`} className={SELECT} disabled={started || closed} title={started ? 'Fixed once the player has teed off' : undefined}
                      value={teeSetIdFor(t, e) ?? ''} onChange={x => { updateEntry(e.id, { teeSetId: x.target.value }); showToast(`${e.name} now plays the ${course?.teeSets?.find(ts => ts.id === x.target.value)?.name} tees`) }}>
                      {course?.teeSets?.map(ts => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 px-2">
                    <select aria-label={`Group for ${e.name}`} className={SELECT} disabled={started || closed || !groups.length} value={group?.id ?? ''}
                      onChange={x => { moveToGroup(t.id, round, e.id, x.target.value); showToast(`${e.name} moved`) }}>
                      {!group && <option value="">No group</option>}
                      {groups.map(g => <option key={g.id} value={g.id}>{formatClock(g.time)} · tee {g.startHole} ({g.entryIds.length})</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 pl-2 pr-6 text-right whitespace-nowrap">
                    {!closed && <>
                      <button onClick={() => setReplacing(e)} disabled={started} className="h-8 px-3 rounded-full text-[12px] font-bold font-display text-ink bg-canvas hover:bg-gray-200 disabled:opacity-40">Replace</button>
                      <button disabled={started}
                        onClick={() => showDialog({
                          title: `Remove ${e.name}?`, message: 'They’re taken out of the field and their group. Refunds follow your refund policy.',
                          confirmLabel: 'Remove', destructive: true,
                          onConfirm: () => { updateEntry(e.id, { status: 'withdrawn' }); showToast(`${e.name} removed`, 'info') },
                        })}
                        className="h-8 px-3 ml-1.5 rounded-full text-[12px] font-bold font-display text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-40">Remove</button>
                    </>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {replacing && <ReplaceModal entry={replacing} onClose={() => setReplacing(null)} />}
      {adding && <RegisterGolferModal t={t} onClose={() => setAdding(false)} />}
    </Panel>
  )
}

/* ───────── Marshal and official slots (organiser) ───────── */

function FillSlotModal({ t, index, onClose }: { t: Tournament; index: number; onClose: () => void }) {
  const { showToast } = useApp()
  const slot = t.officials![index]
  const [name, setName] = useState(slot.name)
  const [email, setEmail] = useState(slot.email ?? '')
  const [phone, setPhone] = useState(slot.phone)
  const [error, setError] = useState('')
  function save() {
    if (!name.trim()) return setError('Name is required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter the email they’ll sign in with')
    const officials: Official[] = t.officials!.map((o, i) => (i === index ? { ...o, name: name.trim(), email: email.trim(), phone, invitedAt: new Date().toISOString() } : o))
    upsertTournament({ ...t, officials })
    showToast(`Login sent to ${email.trim()} (demo password: ${INVITE_PASSWORD})`)
    onClose()
  }
  return (
    <Modal title={`${slot.name ? 'Change' : 'Fill'} the ${slot.role.toLowerCase()} slot`} subtitle="They get a login for this tournament only. It stops working when the tournament closes." onClose={onClose}
      footer={<><Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button><Button fullWidth onClick={save}>Send login</Button></>}>
      <Input label="Name" value={name} onChange={e => { setName(e.target.value); setError('') }} />
      <Input label="Email (their login)" type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} />
      <Input label="Phone" type="tel" value={phone} error={error} onChange={e => setPhone(e.target.value)} />
    </Modal>
  )
}

export function StaffSlotsBoard({ t, canEdit }: { t: Tournament; canEdit: boolean }) {
  useOpsVersion()
  const { showToast } = useApp()
  const [filling, setFilling] = useState<number | null>(null)
  const slots = (t.officials ?? []).map((o, index) => ({ o, index, role: staffRoleOf(o) })).filter(s => s.role)
  const closed = t.status === 'completed' || t.status === 'cancelled'

  function addSlot(role: 'Marshal' | 'Tournament official') {
    upsertTournament({ ...t, officials: [...(t.officials ?? []), { name: '', role, phone: '' }] })
    showToast(`${role} slot added`)
  }

  return (
    <Panel title="Marshals & officials" subtitle="Logins for this tournament only. Access ends automatically when the tournament closes."
      aside={canEdit && !closed && <>
        <Button size="sm" variant="secondary" onClick={() => addSlot('Marshal')}>+ Marshal slot</Button>
        <Button size="sm" variant="secondary" onClick={() => addSlot('Tournament official')}>+ Official slot</Button>
      </>}>
      {slots.length === 0 ? <p className="text-[14px] text-gray-500 py-6 text-center">No marshal or official slots.</p> : (
        <ul className="divide-y divide-black/[0.05]">
          {slots.map(({ o, index, role }) => {
            const status = slotStatus(t, o)
            return (
              <li key={index} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-11 h-11 rounded-full bg-canvas flex items-center justify-center font-display font-extrabold text-ink text-[13px]">
                  {o.name ? o.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('') : '?'}
                </span>
                <span className="flex-1 min-w-[160px]">
                  <span className="block text-[14px] font-semibold text-ink">{o.name || 'Open slot'}</span>
                  <span className="block text-[12px] text-gray-500">{STAFF_ROLE_LABEL[role!]}{o.email ? ` · ${o.email}` : ''}{o.phone ? ` · ${o.phone}` : ''}</span>
                </span>
                <SlotChip status={status} invited={!!o.invitedAt} />
                {canEdit && !closed && <Button size="sm" variant="secondary" onClick={() => setFilling(index)}>{o.name ? 'Change' : 'Fill slot'}</Button>}
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-4 text-[12px] text-gray-500 leading-relaxed">
        <span className="font-bold text-ink">Marshal:</span> pace of play, tee sheet, logging incidents; can’t see or change scores.{' '}
        <span className="font-bold text-ink">Tournament official:</span> checks scorecards, settles disputes and corrects scores with a reason.
      </p>
      {filling !== null && <FillSlotModal t={t} index={filling} onClose={() => setFilling(null)} />}
    </Panel>
  )
}
