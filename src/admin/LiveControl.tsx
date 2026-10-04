import { Fragment, useState } from 'react'
import type { Tournament } from '../types'
import { Button, EmptyState, StatusBadge } from '../components'
import { getCourse } from '../data'
import { useApp } from '../app-context'
import { navigate } from '../router'
import { PageHeader } from '../shell'
import { setTournamentStatus, upsertTournament, useDataVersion } from '../store'
import {
  cardFor, cardState, entriesFor, generateTeeSheet, groupsFor, leaderboard, roundHoles, setCardState, setStrokes,
  simulateTick, useLiveVersion,
} from '../live'
import { formatClock, toPar } from '../golf'
import { BackLink } from '../screens/TournamentDetails'
import { ScoreCell } from '../screens/Leaderboard'
import { NoAccess } from './AdminShell'
import { scopedTournaments } from './access'

/**
 * Tournament-day control for organisers and platform staff: build the tee sheet from the field,
 * watch the live leaderboard, correct and verify scorecards, then publish results.
 */
export function AdminTournamentLive({ id }: { id: string }) {
  useDataVersion()
  useLiveVersion()
  const { can, adminUser, showToast, showDialog } = useApp()
  const t = scopedTournaments(adminUser).find(x => x.id === id)
  const [round, setRound] = useState(1)
  const [editing, setEditing] = useState<string | null>(null)

  if (!can('tournaments.view')) return <NoAccess what="view tournaments" />
  if (!t) {
    return (
      <div className="bg-white rounded-[32px] shadow-card">
        <EmptyState title="Tournament not found" subtitle="It may have been deleted." action={{ label: 'Back to tournaments', onClick: () => navigate('/admin/tournaments') }} />
      </div>
    )
  }

  const course = getCourse(t.courseId)
  const holes = course ? roundHoles(t, course, round) : []
  const field = entriesFor(t.id)
  const registered = field.filter(e => e.status === 'registered')
  const waitlist = field.filter(e => e.status === 'waitlist')
  const groups = groupsFor(t.id, round)
  const rows = leaderboard(t, round)
  const canRun = can('tournaments.status')
  const live = t.status === 'in-progress'
  const verified = registered.filter(e => cardState(t.id, e.id, round) === 'verified').length
  const allVerified = registered.length > 0 && verified === registered.length

  function start() {
    if (!groups.length) generateTeeSheet(t!, round)
    setTournamentStatus(t!.id, 'in-progress')
    showToast('Tournament is live — scoring is open')
  }

  function publish() {
    showDialog({
      title: 'Publish final results?',
      message: allVerified ? 'The tournament is marked completed and results become visible to golfers.' : `${registered.length - verified} card(s) aren't verified yet. Publish anyway as provisional?`,
      confirmLabel: 'Publish results',
      onConfirm: () => {
        upsertTournament({ ...(t as Tournament), status: 'completed', registrationStatus: 'closed', resultsPublished: true })
        showToast('Results published')
      },
    })
  }

  return (
    <div className="page-in">
      <BackLink label="Tournament" onClick={() => navigate(`/admin/tournaments/${t.id}`)} />
      <PageHeader
        eyebrow={`${t.venue} · ${t.dateRange}`}
        title={t.name}
        actions={
          <>
            <StatusBadge status={t.status} size="md" />
            {canRun && !live && t.status !== 'completed' && t.status !== 'cancelled' && <Button onClick={start}>Start tournament</Button>}
            {canRun && live && <Button variant="secondary" onClick={() => { simulateTick(t, round); showToast('Simulated the next hole for the field', 'info') }}>Simulate next hole</Button>}
            {canRun && (live || t.status === 'completed') && !t.resultsPublished && <Button onClick={publish}>Publish results</Button>}
          </>
        }
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          ['Registered', `${registered.length} / ${t.maxPlayers}`],
          ['Waiting list', String(waitlist.length)],
          ['Groups', String(groups.length)],
          ['Cards verified', `${verified} / ${registered.length}`],
        ].map(([label, value], i) => (
          <div key={label} className={`rounded-[24px] p-5 ${i === 0 ? 'bg-ink text-white' : 'bg-white shadow-card'}`}>
            <p className={`text-[13px] font-semibold ${i === 0 ? 'text-white/55' : 'text-gray-500'}`}>{label}</p>
            <p className={`font-display font-extrabold text-[30px] leading-tight ${i === 0 ? 'text-lime-400' : 'text-ink'}`}>{value}</p>
          </div>
        ))}
      </div>

      {(t.rounds?.length ?? 1) > 1 && (
        <div className="flex gap-2 mb-5">
          {t.rounds!.map(r => (
            <button key={r.number} onClick={() => setRound(r.number)} aria-pressed={round === r.number}
              className={`h-9 px-4 rounded-full text-[13px] font-semibold font-display ${round === r.number ? 'bg-ink text-white' : 'bg-white text-gray-600 shadow-card'}`}>
              Round {r.number}
            </button>
          ))}
        </div>
      )}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 items-start">
        {/* Tee sheet */}
        <section className="bg-white rounded-[28px] shadow-card p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display font-bold text-ink text-[19px]">Tee sheet · round {round}</h2>
              <p className="text-[12px] text-gray-500">{t.teeSheet?.startType === 'shotgun' ? 'Shotgun start' : `Every ${t.teeSheet?.intervalMinutes} min`} · groups of {t.teeSheet?.groupSize} by handicap</p>
            </div>
            {canRun && (
              <Button size="sm" variant="secondary" onClick={() => {
                const go = () => { generateTeeSheet(t, round); showToast('Tee sheet generated') }
                if (groups.length) showDialog({ title: 'Rebuild the tee sheet?', message: 'Groups and tee times are rebuilt from the current field.', confirmLabel: 'Rebuild', onConfirm: go })
                else go()
              }}>
                {groups.length ? 'Rebuild' : 'Generate'}
              </Button>
            )}
          </div>
          {groups.length === 0 ? (
            <p className="text-[14px] text-gray-500 py-6 text-center">No groups yet — generate them once registration closes.</p>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {groups.map(g => (
                <li key={g.id} className="flex gap-4 py-3">
                  <span className="w-20 flex-shrink-0">
                    <span className="block font-display font-extrabold text-ink text-[15px]">{formatClock(g.time)}</span>
                    <span className="block text-[12px] text-gray-500">Hole {g.startHole}</span>
                  </span>
                  <span className="text-[13px] text-gray-600 leading-relaxed">
                    {g.entryIds.map(eid => field.find(f => f.id === eid)?.name).filter(Boolean).join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Scorecards */}
        <section className="bg-white rounded-[28px] shadow-card overflow-hidden">
          <div className="px-6 pt-6 pb-3">
            <h2 className="font-display font-bold text-ink text-[19px]">Leaderboard & scorecards</h2>
            <p className="text-[12px] text-gray-500">Open a card to correct a score, then verify it. Verified cards are locked for the player.</p>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-bold font-display text-gray-400 border-y border-black/[0.05]">
                <th className="py-2.5 pl-6 pr-2">Pos</th>
                <th className="py-2.5 px-2">Player</th>
                <th className="py-2.5 px-2 text-right">Gross</th>
                <th className="py-2.5 px-2 text-right">Net</th>
                <th className="py-2.5 px-2 text-right">Thru</th>
                <th className="py-2.5 pl-2 pr-6 text-right">Card</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const state = r.state
                const open = editing === r.entry.id
                const card = cardFor(t, r.entry.id, round)
                return (
                  <Fragment key={r.entry.id}>
                    <tr onClick={() => setEditing(open ? null : r.entry.id)} className="border-b border-black/[0.05] cursor-pointer hover:bg-canvas/60">
                      <td className="py-3 pl-6 pr-2 font-display font-extrabold text-ink">{r.position}</td>
                      <td className="py-3 px-2 text-[14px] font-semibold text-ink">{r.entry.name}</td>
                      <td className="py-3 px-2 text-right font-display font-bold">{r.thru ? toPar(r.grossToPar) : '–'}</td>
                      <td className="py-3 px-2 text-right text-[13px] text-gray-600">{r.thru ? toPar(r.netToPar) : '–'}</td>
                      <td className="py-3 px-2 text-right text-[13px] text-gray-600">{r.thru === r.holes ? 'F' : r.thru}</td>
                      <td className="py-3 pl-2 pr-6 text-right">
                        <span className={`text-[11px] font-bold font-display rounded-full px-2.5 py-1 ${state === 'verified' ? 'bg-emerald-50 text-emerald-700' : state === 'submitted' ? 'bg-amber-50 text-amber-700' : 'bg-canvas text-gray-500'}`}>
                          {state === 'verified' ? 'Verified' : state === 'submitted' ? 'Submitted' : 'Open'}
                        </span>
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-canvas/60 border-b border-black/[0.05]">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="overflow-x-auto">
                            <div className="flex gap-1 min-w-max">
                              {holes.map((h, i) => (
                                <label key={h.hole} className="flex flex-col items-center gap-1 w-9">
                                  <span className="text-[10px] font-bold text-gray-400">{h.hole}</span>
                                  {state === 'verified' || !canRun ? <ScoreCell strokes={card[i]} par={h.par} /> : (
                                    <input type="number" min={1} max={15} aria-label={`${r.entry.name} hole ${h.hole}`} value={card[i] ?? ''}
                                      onChange={e => setStrokes(t, r.entry.id, round, i, e.target.value === '' ? null : Number(e.target.value))}
                                      className="w-9 h-8 rounded-lg bg-white text-center text-[13px] font-semibold border border-transparent focus:border-pine-400 focus:outline-none" />
                                  )}
                                </label>
                              ))}
                            </div>
                          </div>
                          {canRun && (
                            <div className="flex gap-2 mt-3">
                              {state !== 'verified'
                                ? <Button size="sm" disabled={card.some(s => s === null)} onClick={() => { setCardState(t.id, r.entry.id, round, 'verified'); showToast(`${r.entry.name}'s card verified`) }}>Verify card</Button>
                                : <Button size="sm" variant="secondary" onClick={() => setCardState(t.id, r.entry.id, round, 'in-progress')}>Reopen card</Button>}
                              {card.some(s => s === null) && state !== 'verified' && <span className="text-[12px] text-gray-500 self-center">All holes need a score before verifying</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-[14px] text-gray-500 py-8 text-center">No registered players yet.</p>}
        </section>
      </div>
    </div>
  )
}
