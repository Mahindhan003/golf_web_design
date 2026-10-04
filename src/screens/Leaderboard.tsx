import { useEffect, useState } from 'react'
import { EmptyState, StatusBadge, Button } from '../components'
import { getTournament, getCourse } from '../data'
import { isPublicTournament } from '../admin/access'
import { navigate } from '../router'
import { PageHeader } from '../shell'
import { useDataVersion } from '../store'
import { cardFor, leaderboard, myEntry, roundHoles, simulateTick, useLiveVersion, type LeaderboardRow } from '../live'
import { toPar } from '../golf'
import { BackLink } from './TournamentDetails'

/** Score cell colour like a TV graphic: birdie or better circled lime, bogey or worse boxed. */
export function ScoreCell({ strokes, par }: { strokes: number | null; par: number }) {
  if (strokes === null) return <span className="text-gray-300">·</span>
  const d = strokes - par
  const shape = d <= -2 ? 'rounded-full bg-amber-300 ring-2 ring-amber-400' : d === -1 ? 'rounded-full bg-lime-400' : d === 1 ? 'rounded-md ring-1 ring-black/25' : d >= 2 ? 'rounded-md bg-ink text-white' : ''
  return <span className={`inline-flex w-7 h-7 items-center justify-center text-[13px] font-bold ${shape}`}>{strokes}</span>
}

const toParClass = (n: number) => (n < 0 ? 'text-rose-600' : n > 0 ? 'text-ink' : 'text-gray-600')

export default function Leaderboard({ id }: { id: string }) {
  useDataVersion()
  useLiveVersion()
  const found = getTournament(id)
  const t = found && isPublicTournament(found) ? found : undefined
  const [round, setRound] = useState(1)
  const [division, setDivision] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [updated, setUpdated] = useState(() => new Date())

  // Live: poll for new scores (a real app gets them pushed over WebSocket/SSE)
  useEffect(() => {
    if (t?.status !== 'in-progress') return
    const timer = setInterval(() => { simulateTick(t, round); setUpdated(new Date()) }, 8000)
    return () => clearInterval(timer)
  }, [t, round])

  if (!t) {
    return (
      <div className="bg-white rounded-[32px] shadow-card">
        <EmptyState title="Tournament not found" subtitle="This leaderboard isn't available." action={{ label: 'Back to tournaments', onClick: () => navigate('/tournaments') }} />
      </div>
    )
  }

  const course = getCourse(t.courseId)
  const holes = course ? roundHoles(t, course, round) : []
  const rows = leaderboard(t, round, division || undefined)
  const stableford = t.format === 'Stableford'
  const showNet = !stableford && t.scoring?.basis !== 'gross'
  const showGross = !stableford && t.scoring?.basis !== 'net'
  const me = myEntry(t.id)
  const live = t.status === 'in-progress'
  const started = rows.some(r => r.thru > 0)

  return (
    <div className="page-in">
      <BackLink label={t.name} onClick={() => navigate(`/tournaments/${t.id}`)} />
      <PageHeader
        eyebrow={`${t.venue} · ${t.dateRange}`}
        title={live ? 'Live leaderboard' : t.status === 'completed' ? 'Results' : 'Leaderboard'}
        actions={
          <>
            {live && <StatusBadge status="in-progress" size="md" />}
            {live && me?.status === 'registered' && <Button onClick={() => navigate(`/tournaments/${t.id}/play`)}>Enter my scores</Button>}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(t.rounds ?? [{ number: 1 }]).map(r => (
          <button key={r.number} onClick={() => setRound(r.number)} aria-pressed={round === r.number}
            className={`h-9 px-4 rounded-full text-[13px] font-semibold font-display ${round === r.number ? 'bg-ink text-white' : 'bg-white text-gray-600 shadow-card'}`}>
            Round {r.number}
          </button>
        ))}
        <span className="w-px h-6 bg-black/10 mx-1" />
        {[{ id: '', name: 'All divisions' }, ...(t.divisions ?? [])].map(d => (
          <button key={d.id} onClick={() => setDivision(d.id)} aria-pressed={division === d.id}
            className={`h-9 px-4 rounded-full text-[13px] font-semibold font-display ${division === d.id ? 'bg-lime-400 text-ink' : 'bg-white text-gray-600 shadow-card'}`}>
            {d.name}
          </button>
        ))}
      </div>

      {!started ? (
        <div className="bg-white rounded-[28px] shadow-card">
          <EmptyState title="No scores yet" subtitle={`Round ${round} hasn't started. Scores appear here hole by hole once play begins.`} />
        </div>
      ) : (
        <div className="bg-white rounded-[28px] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[12px] font-bold font-display text-gray-400 border-b border-black/[0.05]">
                  <th className="py-3.5 pl-6 pr-2 w-16">Pos</th>
                  <th className="py-3.5 px-2">Player</th>
                  {stableford && <th className="py-3.5 px-2 text-right">Points</th>}
                  {showGross && <th className="py-3.5 px-2 text-right">{showNet ? 'Gross' : 'To par'}</th>}
                  {showNet && <th className="py-3.5 px-2 text-right">Net</th>}
                  <th className="py-3.5 px-2 text-right">Thru</th>
                  <th className="py-3.5 pl-2 pr-6 text-right hidden sm:table-cell">Strokes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <LeaderRow key={row.entry.id} row={row} open={open === row.entry.id} onToggle={() => setOpen(open === row.entry.id ? null : row.entry.id)}
                    stableford={stableford} showGross={showGross} showNet={showNet} holes={holes} card={cardFor(t, row.entry.id, round)}
                    division={t.divisions?.find(d => d.id === row.entry.divisionId)?.name} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-[12px] text-gray-400 mt-3">
        {live ? `Updated ${updated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })} · refreshes automatically` : 'Final unless marked provisional'}
        {' · '}Net uses {t.scoring?.allowancePct ?? 100}% of course handicap from each division's tees. Tap a player for their card.
      </p>
    </div>
  )
}

function LeaderRow({ row, open, onToggle, stableford, showGross, showNet, holes, card, division }: {
  row: LeaderboardRow; open: boolean; onToggle: () => void; stableford: boolean; showGross: boolean; showNet: boolean
  holes: { hole: number; par: number }[]; card: (number | null)[]; division?: string
}) {
  const finished = row.thru === row.holes
  return (
    <>
      <tr onClick={onToggle} className={`border-b border-black/[0.05] cursor-pointer transition-colors ${row.entry.isMe ? 'bg-lime-300/40 hover:bg-lime-300/60' : 'hover:bg-canvas/70'}`}>
        <td className="py-3.5 pl-6 pr-2 font-display font-extrabold text-ink text-[15px]">{row.position}</td>
        <td className="py-3.5 px-2">
          <span className="block font-display font-bold text-ink text-[14px]">{row.entry.name}{row.entry.isMe && <span className="ml-2 text-[11px] bg-ink text-lime-400 rounded-full px-2 py-0.5 align-middle">You</span>}</span>
          <span className="block text-[12px] text-gray-500">{division} · HCP {row.entry.handicapIndex.toFixed(1)} (plays {row.playing})</span>
        </td>
        {stableford && <td className="py-3.5 px-2 text-right font-display font-extrabold text-[16px] text-ink">{row.points}</td>}
        {showGross && <td className={`py-3.5 px-2 text-right font-display font-extrabold text-[16px] ${toParClass(row.grossToPar)}`}>{toPar(row.grossToPar)}</td>}
        {showNet && <td className={`py-3.5 px-2 text-right font-display font-bold text-[15px] ${toParClass(row.netToPar)}`}>{toPar(row.netToPar)}</td>}
        <td className="py-3.5 px-2 text-right text-[13px] font-semibold text-gray-600">{finished ? 'F' : row.thru}</td>
        <td className="py-3.5 pl-2 pr-6 text-right text-[13px] text-gray-500 hidden sm:table-cell">{row.gross}</td>
      </tr>
      {open && (
        <tr className="bg-canvas/60 border-b border-black/[0.05]">
          <td colSpan={7} className="px-6 py-4">
            <div className="overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {holes.map((h, i) => (
                  <div key={h.hole} className="flex flex-col items-center gap-1 w-8">
                    <span className="text-[10px] font-bold text-gray-400">{h.hole}</span>
                    <span className="text-[10px] text-gray-400">P{h.par}</span>
                    <ScoreCell strokes={card[i]} par={h.par} />
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[12px] text-gray-500 mt-2">
              {row.state === 'verified' ? 'Card verified' : row.state === 'submitted' ? 'Card submitted — awaiting verification' : 'Card in progress'}
            </p>
          </td>
        </tr>
      )}
    </>
  )
}
