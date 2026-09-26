import { useState, type ReactNode } from 'react'
import {
  Button, StatusBadge, GlassChip, InfoTile, SpotsBar, EmptyState,
  IconCalendar, IconClock, IconCourse, IconUsers, IconCheckCircle,
} from '../components'
import { getTournament, getCourse } from '../data'
import { useApp } from '../app-context'
import { navigate } from '../router'
import { useFakeLoad } from '../shell'

export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 text-[14px] font-semibold font-display text-gray-500 hover:text-ink mb-5 group">
      <span className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center group-hover:-translate-x-0.5 transition-transform">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#0c1a12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
      {label}
    </button>
  )
}

function Notice({ tone, title, body }: { tone: 'rose' | 'amber' | 'gray'; title: string; body: string }) {
  const tones = { rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-700', gray: 'bg-canvas text-gray-700' }
  return (
    <div className={`rounded-2xl px-5 py-4 ${tones[tone]}`}>
      <p className="text-sm font-bold font-display">{title}</p>
      <p className="text-[13px] opacity-80 mt-0.5 leading-relaxed">{body}</p>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-[28px] shadow-card p-6 lg:p-7">
      <h2 className="font-display font-bold text-ink text-[19px] tracking-tight mb-4">{title}</h2>
      {children}
    </section>
  )
}

export default function TournamentDetails({ id }: { id: string }) {
  const { showToast, showDialog } = useApp()
  const loading = useFakeLoad(600)
  const t = getTournament(id)
  const [registered, setRegistered] = useState(t?.registrationStatus === 'registered')
  const [regLoading, setRegLoading] = useState(false)

  const goBack = () => (window.history.length > 1 ? window.history.back() : navigate('/tournaments'))

  if (loading) {
    return (
      <div>
        <div className="h-9 w-40 skeleton rounded-full mb-5" />
        <div className="h-[380px] skeleton rounded-[32px]" />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 mt-6">
          <div className="h-64 skeleton rounded-[28px]" />
          <div className="h-80 skeleton rounded-[28px]" />
        </div>
      </div>
    )
  }

  if (!t) {
    return (
      <div className="bg-white rounded-[32px] shadow-card">
        <EmptyState title="Tournament not found" subtitle="This tournament may have been removed or the link is invalid."
          action={{ label: 'Back to tournaments', onClick: () => navigate('/tournaments') }} />
      </div>
    )
  }

  const course = getCourse(t.courseId)
  const spotsLeft    = t.maxPlayers - t.players
  const isCancelled  = t.status === 'cancelled'
  const isCompleted  = t.status === 'completed'
  const isRegistered = registered
  const isOpen       = t.registrationStatus === 'open' && !isCancelled && !isCompleted
  const isComingSoon = t.registrationStatus === 'coming-soon'
  const isClosed     = t.registrationStatus === 'closed' && !isCancelled && !isCompleted

  const badgeStatus =
    isCancelled ? 'cancelled' : isCompleted ? 'completed' : isRegistered ? 'registered'
    : isOpen ? 'open' : isComingSoon ? 'coming-soon' : 'closed'

  function handleRegister() {
    if (isRegistered) {
      showDialog({
        title: 'Cancel registration',
        message: 'Are you sure you want to cancel your registration for this tournament?',
        confirmLabel: 'Cancel registration',
        cancelLabel: 'Keep spot',
        destructive: true,
        onConfirm: () => { setRegistered(false); showToast('Registration cancelled', 'info') },
      })
      return
    }
    setRegLoading(true)
    setTimeout(() => {
      setRegLoading(false)
      setRegistered(true)
      showToast(`You're registered for ${t!.name}!`)
    }, 1500)
  }

  const primaryAction =
    isCancelled ? <Button variant="ghost" disabled fullWidth>Tournament cancelled</Button>
    : isCompleted ? <Button variant="ghost" disabled fullWidth>Tournament ended</Button>
    : isClosed ? <Button variant="ghost" disabled fullWidth>Registration closed</Button>
    : isComingSoon ? <Button fullWidth onClick={() => showToast("You'll be notified when registration opens")}>Notify me</Button>
    : isRegistered ? <Button variant="danger" fullWidth onClick={handleRegister} loading={regLoading}>Cancel registration</Button>
    : spotsLeft === 0 ? <Button variant="ghost" disabled fullWidth>Fully booked</Button>
    : <Button fullWidth onClick={handleRegister} loading={regLoading}>{regLoading ? 'Registering…' : 'Register now'}</Button>

  return (
    <div className="page-in">
      <BackLink label="Tournaments" onClick={goBack} />

      {/* Banner */}
      <div className="relative h-[300px] lg:h-[380px] rounded-[32px] overflow-hidden bg-pine-100 shadow-card">
        <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 scrim-top" />
        <div className="absolute inset-0 scrim-bottom" />

        {t.prize && !isCancelled && (
          <div className="absolute top-5 right-5 rounded-2xl px-4 py-2.5 max-w-[260px] shadow-md" style={{ background: 'rgba(201,162,39,0.95)' }}>
            <p className="text-[10px] text-ink/60 font-bold font-display uppercase tracking-wider leading-none">Prize</p>
            <p className="text-[14px] text-ink font-bold font-display leading-tight mt-1">{t.prize}</p>
          </div>
        )}

        <div className="absolute bottom-7 left-7 right-7">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <StatusBadge status={badgeStatus} size="md" onImage />
            <GlassChip>{t.format}</GlassChip>
            <GlassChip>{t.category}</GlassChip>
          </div>
          <h1 className="font-display font-extrabold text-white text-[32px] lg:text-[44px] leading-[1.05] tracking-tight max-w-3xl">{t.name}</h1>
          <p className="text-white/75 text-[15px] mt-2 flex items-center gap-1.5">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5a4 4 0 014 4c0 2.8-4 8.5-4 8.5S3.5 8.3 3.5 5.5a4 4 0 014-4z" stroke="#c8ec5a" strokeWidth="1.3"/>
              <circle cx="7.5" cy="5.5" r="1.5" stroke="#c8ec5a" strokeWidth="1.3"/>
            </svg>
            {t.venue} · {t.location}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 mt-6 items-start">
        {/* Main column */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoTile icon={<IconCalendar />} label="Date" value={t.dateRange} />
            <InfoTile icon={<IconClock />} label="Tee time" value={t.time} />
            <InfoTile
              icon={
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="1" y="1" width="13" height="13" rx="3" stroke="#4a9264" strokeWidth="1.2"/>
                  <path d="M1 5.5h13M5.5 1v4.5" stroke="#4a9264" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              }
              label="Format"
              value={t.format}
            />
            <InfoTile icon={<IconUsers />} label="Entry fee" value={t.entryFee} />
          </div>

          <Card title="About this tournament">
            <p className={`text-[15px] leading-relaxed ${isCancelled ? 'text-rose-600' : 'text-gray-600'}`}>{t.description}</p>
          </Card>

          {course && (
            <Card title="The course">
              <a href={`#/courses/${course.id}`} className="group flex items-center gap-4 rounded-2xl bg-canvas p-3 hover:bg-gray-200/60 transition-colors">
                <img src={course.imageUrl} alt="" className="w-24 h-20 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-ink text-[16px] tracking-tight">{course.name}</p>
                  <p className="text-[13px] text-gray-500 mt-0.5">{course.city}, {course.region}</p>
                  <p className="text-[12px] text-pine-600 font-semibold mt-1">Par {course.par} · {course.yardage.toLocaleString()} yds · {course.holes} holes</p>
                </div>
                <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#0c1a12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </a>
            </Card>
          )}
        </div>

        {/* Sticky action card */}
        <aside className="lg:sticky lg:top-8 bg-white rounded-[28px] shadow-card p-6 space-y-5">
          <div>
            <p className="text-[13px] text-gray-500 font-semibold font-display">Entry fee</p>
            <p className="font-display font-extrabold text-ink text-[34px] leading-tight tracking-tight">{t.entryFee}</p>
          </div>

          {isRegistered && !isCancelled && !isCompleted && (
            <div className="flex items-center gap-3 bg-lime-300/50 rounded-2xl px-4 py-3.5">
              <IconCheckCircle />
              <div>
                <p className="text-sm font-bold text-ink font-display">You're registered!</p>
                <p className="text-xs text-pine-700 mt-0.5">Your spot is confirmed.</p>
              </div>
            </div>
          )}

          {isOpen && !isRegistered && (
            <div className="bg-canvas rounded-2xl p-4"><SpotsBar players={t.players} maxPlayers={t.maxPlayers} /></div>
          )}
          {isClosed && <Notice tone="rose" title="Registration closed" body="The registration period for this tournament has ended." />}
          {isComingSoon && <Notice tone="amber" title="Registration opening soon" body="Registration details will be announced shortly." />}
          {isCancelled && <Notice tone="rose" title="Tournament cancelled" body="If you were registered, you will receive a full refund within 5–7 business days." />}
          {isCompleted && <Notice tone="gray" title="Tournament completed" body="Results and leaderboards are archived." />}

          <div className="space-y-2.5">
            {primaryAction}
            <Button variant="secondary" fullWidth onClick={() => navigate(`/courses/${t.courseId}`)}>
              <IconCourse /> View course
            </Button>
          </div>

          <div className="border-t border-black/[0.06] pt-4 space-y-2.5 text-[13px]">
            <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-semibold text-ink">{t.dateRange}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Players</span><span className="font-semibold text-ink">{t.players} / {t.maxPlayers}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500">Venue</span><span className="font-semibold text-ink text-right">{t.venue}</span></div>
          </div>
        </aside>
      </div>
    </div>
  )
}

