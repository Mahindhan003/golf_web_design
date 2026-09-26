import {
  SectionHeader, TournamentCard, StatusBadge, GlassChip, IconArrowRight, Button,
} from '../components'
import { MOCK_PROFILE, MOCK_TOURNAMENTS } from '../data'
import { PageHeader, useFakeLoad } from '../shell'
import { useApp } from '../app-context'
import { navigate } from '../router'

function daysUntil(date: string) {
  const ms = new Date(`${date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.round(ms / 86_400_000)
}

export default function Home() {
  const { showToast, profileVersion } = useApp()
  void profileVersion
  const loading = useFakeLoad(700)
  const p = MOCK_PROFILE

  const registered = MOCK_TOURNAMENTS.find(t => t.registrationStatus === 'registered')
  const open = MOCK_TOURNAMENTS.filter(t => t.registrationStatus === 'open')
  const upcoming = MOCK_TOURNAMENTS.filter(t => ['upcoming', 'published'].includes(t.status) && !open.includes(t))
  const forYou = [...open, ...upcoming].slice(0, 3)

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  })()

  if (loading) {
    return (
      <div>
        <div className="h-4 w-40 skeleton rounded-full" />
        <div className="h-9 w-72 skeleton rounded-full mt-3 mb-8" />
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-[340px] skeleton rounded-[32px]" />
          <div className="lg:col-span-5 space-y-6">
            <div className="h-[150px] skeleton rounded-[28px]" />
            <div className="h-[166px] skeleton rounded-[28px]" />
          </div>
        </div>
      </div>
    )
  }

  const days = registered ? daysUntil(registered.startDate) : 0

  return (
    <div className="page-in">
      <PageHeader
        eyebrow={`${greeting} 👋`}
        title={`${p.firstName} ${p.lastName}`}
        actions={
          <>
            <button
              onClick={() => showToast('Notifications coming soon', 'info')}
              aria-label="Notifications"
              className="relative w-12 h-12 bg-white rounded-full shadow-card flex items-center justify-center hover:scale-105 transition-transform"
            >
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <path d="M9 2a5.5 5.5 0 00-5.5 5.5v2.25L2 12h14l-1.5-2.25V7.5A5.5 5.5 0 009 2z" stroke="#0c1a12" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M7 14.5a2 2 0 004 0" stroke="#0c1a12" strokeWidth="1.4"/>
              </svg>
              <span className="absolute top-3 right-3.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            <Button onClick={() => navigate('/tournaments')}>Browse tournaments</Button>
          </>
        }
      />

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Up next */}
        <div className="lg:col-span-7">
          {registered ? (
            <a
              href={`#/tournaments/${registered.id}`}
              className="group relative block h-[340px] rounded-[32px] overflow-hidden shadow-card"
            >
              <img src={registered.imageUrl} alt={registered.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
              <div className="absolute inset-0 scrim-bottom" />
              <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="glass-dark h-7 px-3 rounded-full text-[12px] font-bold font-display text-white inline-flex items-center">Up next</span>
                  <StatusBadge status="registered" size="md" />
                </div>
                {days > 0 && <GlassChip>{days === 1 ? 'Tomorrow' : `In ${days} days`}</GlassChip>}
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex items-end gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-[13px] font-semibold font-display">{registered.dateRange} · {registered.venue}, {registered.city}</p>
                  <h2 className="font-display font-extrabold text-white text-[24px] sm:text-[30px] leading-tight tracking-tight mt-1">{registered.name}</h2>
                </div>
                <span className="w-14 h-14 rounded-full bg-lime-400 flex items-center justify-center flex-shrink-0 group-hover:translate-x-1 transition-transform">
                  <IconArrowRight />
                </span>
              </div>
            </a>
          ) : (
            <div className="h-[340px] rounded-[32px] bg-white shadow-card flex flex-col items-center justify-center text-center p-8">
              <p className="font-display font-bold text-ink text-[20px]">No upcoming tournaments</p>
              <p className="text-gray-500 mt-1">Find an event and register to see it here.</p>
              <Button className="mt-5" onClick={() => navigate('/tournaments')}>Browse tournaments</Button>
            </div>
          )}
        </div>

        {/* Stats + quick actions */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-ink rounded-[28px] p-6 shadow-float relative overflow-hidden">
            <div
              className="absolute inset-y-0 right-0 w-[70%] pointer-events-none"
              style={{ background: 'linear-gradient(90deg, rgba(200,236,90,0) 0%, rgba(200,236,90,0.14) 40%, rgba(200,236,90,0.30) 100%)' }}
            />
            <p className="relative text-white/55 text-[13px] font-semibold font-display">Handicap Index</p>
            <div className="relative flex items-end justify-between mt-1">
              <p className="font-display font-extrabold text-lime-400 text-[56px] leading-none tracking-tight">{p.handicapIndex.toFixed(1)}</p>
              <div className="flex gap-6 pb-1">
                <div className="text-right">
                  <p className="font-display font-bold text-white text-[24px] leading-none">{p.tournamentsPlayed}</p>
                  <p className="text-white/55 text-[12px] mt-1.5">Played</p>
                </div>
                <div className="w-px bg-white/15" />
                <div className="text-right">
                  <p className="font-display font-bold text-white text-[24px] leading-none">{p.wins}</p>
                  <p className="text-white/55 text-[12px] mt-1.5">Wins</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            <a href="#/tournaments" className="bg-lime-400 rounded-[28px] p-5 flex flex-col justify-between hover:-translate-y-0.5 transition-transform">
              <span className="w-11 h-11 bg-ink rounded-full flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="8" cy="8" r="5.5" stroke="#c8ec5a" strokeWidth="1.6"/>
                  <path d="M12.5 12.5l3 3" stroke="#c8ec5a" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="mt-6">
                <span className="block font-display font-bold text-ink text-[16px] leading-tight tracking-tight">Browse tournaments</span>
                <span className="block text-[12px] text-pine-800/70 mt-0.5">Find & register</span>
              </span>
            </a>
            <a href="#/profile" className="bg-white shadow-card rounded-[28px] p-5 flex flex-col justify-between hover:-translate-y-0.5 transition-transform">
              <span className="w-11 h-11 bg-canvas rounded-full flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="6" r="3.5" stroke="#0c1a12" strokeWidth="1.5"/>
                  <path d="M3 16c0-3.314 2.686-5.5 6-5.5s6 2.186 6 5.5" stroke="#0c1a12" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="mt-6">
                <span className="block font-display font-bold text-ink text-[16px] leading-tight tracking-tight">My profile</span>
                <span className="block text-[12px] text-gray-500 mt-0.5">Handicap & details</span>
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Open for registration first, then upcoming events */}
      {forYou.length > 0 && (
        <section className="mt-12">
          <SectionHeader title="Open & upcoming" action={{ label: 'See all tournaments', onClick: () => navigate('/tournaments') }} />
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {forYou.map(t => (
              <TournamentCard key={t.id} tournament={t} onPress={() => navigate(`/tournaments/${t.id}`)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
