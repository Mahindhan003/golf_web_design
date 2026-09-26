import type { HoleData } from '../types'
import { TournamentCard, InfoRow, EmptyState, IconPin } from '../components'
import { getCourse, getTournamentsByCourse } from '../data'
import { navigate } from '../router'
import { useFakeLoad } from '../shell'
import { BackLink } from './TournamentDetails'

function NineTable({ label, holes, totalLabel }: { label: string; holes: HoleData[]; totalLabel: string }) {
  const par = holes.reduce((s, h) => s + h.par, 0)
  const yds = holes.reduce((s, h) => s + h.yards, 0)
  return (
    <div className="rounded-2xl bg-canvas p-1.5">
      <p className="px-3 pt-2 pb-2 text-[13px] font-bold font-display text-gray-500">{label}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-center text-[13px] border-separate border-spacing-0">
          <thead>
            <tr className="text-[11px] font-bold font-display text-gray-400">
              <th className="py-2 text-left pl-3 font-bold">Hole</th>
              {holes.map(h => <th key={h.hole} className="py-2 font-bold">{h.hole}</th>)}
              <th className="py-2 pr-3 font-bold text-ink">{totalLabel}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            <tr>
              <td className="py-2.5 pl-3 text-left font-semibold text-gray-500 rounded-tl-xl">Par</td>
              {holes.map(h => <td key={h.hole} className="py-2.5 font-semibold text-ink">{h.par}</td>)}
              <td className="py-2.5 pr-3 font-bold text-ink rounded-tr-xl">{par}</td>
            </tr>
            <tr className="[&>td]:border-t [&>td]:border-black/[0.05]">
              <td className="py-2.5 pl-3 text-left font-semibold text-gray-500">Yards</td>
              {holes.map(h => <td key={h.hole} className="py-2.5 text-gray-600">{h.yards}</td>)}
              <td className="py-2.5 pr-3 font-bold text-ink">{yds.toLocaleString()}</td>
            </tr>
            <tr className="[&>td]:border-t [&>td]:border-black/[0.05]">
              <td className="py-2.5 pl-3 text-left font-semibold text-gray-500 rounded-bl-xl">Hcp</td>
              {holes.map(h => <td key={h.hole} className="py-2.5 text-gray-400">{h.handicap}</td>)}
              <td className="py-2.5 pr-3 text-gray-400 rounded-br-xl">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function CourseDetails({ id }: { id: string }) {
  const loading = useFakeLoad(600)
  const course = getCourse(id)
  const tournaments = getTournamentsByCourse(id)

  const goBack = () => (window.history.length > 1 ? window.history.back() : navigate('/tournaments'))

  if (loading) {
    return (
      <div>
        <div className="h-9 w-32 skeleton rounded-full mb-5" />
        <div className="h-[340px] skeleton rounded-[32px]" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-20 skeleton rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="bg-white rounded-[32px] shadow-card">
        <EmptyState title="Course not found" subtitle="This course could not be loaded."
          action={{ label: 'Back to tournaments', onClick: () => navigate('/tournaments') }} />
      </div>
    )
  }

  const stats: [string | number, string][] = [
    [course.holes, 'Holes'],
    [course.par, 'Par'],
    [course.yardage.toLocaleString(), 'Yards'],
    [course.rating.toFixed(1), 'Rating'],
    [course.slope, 'Slope'],
    [course.established, 'Established'],
  ]

  const front = course.holeData.slice(0, 9)
  const back  = course.holeData.slice(9, 18)

  return (
    <div className="page-in">
      <BackLink label="Back" onClick={goBack} />

      <div className="relative h-[280px] lg:h-[340px] rounded-[32px] overflow-hidden bg-pine-100 shadow-card">
        <img src={course.imageUrl} alt={course.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 scrim-bottom" />
        <div className="absolute bottom-7 left-7 right-7">
          <p className="text-white/75 text-[14px] font-semibold font-display flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5a4 4 0 014 4c0 2.8-4 8.5-4 8.5S3.5 8.3 3.5 5.5a4 4 0 014-4z" stroke="#c8ec5a" strokeWidth="1.3"/>
              <circle cx="7.5" cy="5.5" r="1.5" stroke="#c8ec5a" strokeWidth="1.3"/>
            </svg>
            {course.city}, {course.region}
          </p>
          <h1 className="font-display font-extrabold text-white text-[32px] lg:text-[44px] leading-[1.05] tracking-tight mt-1">{course.name}</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-6">
        {stats.map(([value, label], i) => (
          <div key={label} className={`rounded-2xl p-4 ${i === 0 ? 'bg-lime-400' : 'bg-white shadow-card'}`}>
            <p className="font-display font-extrabold text-[22px] tracking-tight text-ink leading-none">{value}</p>
            <p className={`text-[12px] font-semibold mt-2 ${i === 0 ? 'text-pine-800' : 'text-gray-500'}`}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 mt-6 items-start">
        <div className="space-y-6">
          <section className="bg-white rounded-[28px] shadow-card p-6 lg:p-7">
            <h2 className="font-display font-bold text-ink text-[19px] tracking-tight mb-3">About the course</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed">{course.description}</p>
          </section>

          <section className="bg-white rounded-[28px] shadow-card p-6 lg:p-7">
            <h2 className="font-display font-bold text-ink text-[19px] tracking-tight mb-4">Scorecard</h2>
            <div className="space-y-3">
              <NineTable label="Front 9" holes={front} totalLabel="OUT" />
              {back.length > 0 && <NineTable label="Back 9" holes={back} totalLabel="IN" />}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 space-y-6">
          <section className="bg-white rounded-[28px] shadow-card p-6 space-y-4">
            <InfoRow icon={<IconPin />} label="Address" value={`${course.address}, ${course.city}, ${course.region}`} />
            <InfoRow
              icon={
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M2 7.5l4 4 7-7" stroke="#4a9264" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              label="Designer"
              value={course.designer}
            />
          </section>

          {tournaments.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-ink text-[18px] tracking-tight mb-3">Tournaments here</h2>
              <div className="space-y-3">
                {tournaments.map(t => (
                  <TournamentCard key={t.id} tournament={t} onPress={() => navigate(`/tournaments/${t.id}`)} compact />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
