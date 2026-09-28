import { MOCK_COURSES } from '../data'
import { scopedTournaments, getOrganizations, useAccessVersion } from './access'
import { useDataVersion, statusLabel } from '../store'
import { PageHeader } from '../shell'
import { Button, StatusBadge } from '../components'
import { navigate } from '../router'
import { IconPlus, Can } from './AdminShell'
import { useApp } from '../app-context'

function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-[28px] p-6 ${accent ? 'bg-ink text-white shadow-float relative overflow-hidden' : 'bg-white shadow-card'}`}>
      {accent && (
        <div className="absolute inset-y-0 right-0 w-[70%] pointer-events-none"
          style={{ background: 'linear-gradient(90deg, rgba(200,236,90,0) 0%, rgba(200,236,90,0.14) 40%, rgba(200,236,90,0.30) 100%)' }} />
      )}
      <p className={`relative text-[13px] font-semibold font-display ${accent ? 'text-white/55' : 'text-gray-500'}`}>{label}</p>
      <p className={`relative font-display font-extrabold text-[40px] leading-none tracking-tight mt-2 ${accent ? 'text-lime-400' : 'text-ink'}`}>{value}</p>
      {sub && <p className={`relative text-[12px] mt-2 ${accent ? 'text-white/55' : 'text-gray-500'}`}>{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  useDataVersion()
  useAccessVersion()
  const { can, adminUser, adminRole, adminOrg } = useApp()
  // Organisers only see numbers for their own events
  const MOCK_TOURNAMENTS = scopedTournaments(adminUser)
  const pendingOrgs = adminOrg ? [] : getOrganizations().filter(o => o.status === 'pending')
  const drafts = MOCK_TOURNAMENTS.filter(t => t.status === 'draft').length
  const total = MOCK_TOURNAMENTS.length
  const open = MOCK_TOURNAMENTS.filter(t => t.status === 'registration-open').length
  const players = MOCK_TOURNAMENTS.reduce((s, t) => s + t.players, 0)
  const capacity = MOCK_TOURNAMENTS.filter(t => t.status !== 'cancelled').reduce((s, t) => s + t.maxPlayers, 0)
  const fill = capacity ? Math.round((players / capacity) * 100) : 0

  const upcoming = [...MOCK_TOURNAMENTS]
    .filter(t => !['completed', 'cancelled'].includes(t.status))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 5)

  const nearlyFull = MOCK_TOURNAMENTS.filter(t => t.status === 'registration-open' && t.maxPlayers - t.players <= 10)

  return (
    <div className="page-in">
      <PageHeader
        eyebrow={`Welcome, ${adminUser?.name.split(' ')[0] ?? 'admin'} · ${adminRole?.name ?? ''}${adminOrg ? ` · ${adminOrg.name}` : ''}`}
        title="Dashboard"
        actions={
          <>
            <Can perm="courses.create"><Button variant="secondary" onClick={() => navigate('/admin/courses/new')}><IconPlus /> New course</Button></Can>
            <Can perm="tournaments.create"><Button onClick={() => navigate('/admin/tournaments/new')}><IconPlus /> New tournament</Button></Can>
          </>
        }
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <Stat accent label={adminOrg ? 'Your tournaments' : 'Tournaments'} value={total} sub={`${open} open for registration${drafts ? ` · ${drafts} draft${drafts === 1 ? '' : 's'}` : ''}`} />
        <Stat label="Players registered" value={players} sub={`${fill}% of total capacity`} />
        <Stat label="Courses" value={MOCK_COURSES.length} sub={`${new Set(MOCK_TOURNAMENTS.map(t => t.courseId)).size} hosting events`} />
        {pendingOrgs.length > 0 && can('organizers.view')
          ? <Stat label="Organisers to review" value={pendingOrgs.length} sub="New organisations waiting for approval" />
          : <Stat label="Needs attention" value={nearlyFull.length} sub="Open events with ≤10 spots left" />}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 mt-8 items-start">
        <section className="bg-white rounded-[28px] shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-ink text-[19px] tracking-tight">Upcoming tournaments</h2>
            {can('tournaments.view') && <a href="#/admin/tournaments" className="text-[13px] font-semibold font-display text-gray-500 hover:text-ink">Manage all</a>}
          </div>
          {upcoming.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No upcoming tournaments. Create one to get started.</p>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {upcoming.map(t => {
                const pct = Math.min(100, Math.round((t.players / t.maxPlayers) * 100))
                return (
                  <li key={t.id}>
                    <a href={can('tournaments.view') ? `#/admin/tournaments/${t.id}` : undefined} className="flex items-center gap-4 py-3.5 group">
                      <img src={t.imageUrl} alt="" className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-ink text-[15px] tracking-tight truncate group-hover:underline decoration-lime-500 decoration-2 underline-offset-4">{t.name}</p>
                        <p className="text-[12px] text-gray-500 truncate">{t.dateRange} · {t.venue}</p>
                      </div>
                      <div className="hidden sm:block w-36">
                        <div className="flex justify-between text-[11px] font-semibold text-gray-500 mb-1"><span>{t.players}/{t.maxPlayers}</span><span>{pct}%</span></div>
                        <div className="h-1.5 bg-canvas rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-400' : 'bg-lime-500'}`} style={{ width: `${pct}%` }} /></div>
                      </div>
                      <span className="w-[140px] hidden md:flex justify-end">
                        <StatusBadge status={t.status === 'registration-open' ? 'open' : t.status} />
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-6">
          {pendingOrgs.length > 0 && can('organizers.view') && (
            <section className="bg-amber-50 rounded-[28px] p-6">
              <h2 className="font-display font-bold text-amber-900 text-[17px] tracking-tight">Awaiting approval</h2>
              <ul className="mt-3 space-y-2">
                {pendingOrgs.slice(0, 4).map(o => (
                  <li key={o.id} className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="font-semibold text-amber-900 truncate">{o.name}</span>
                    <span className="text-amber-700 text-[12px] flex-shrink-0">{o.type}</span>
                  </li>
                ))}
              </ul>
              <a href="#/admin/organizers" className="mt-4 inline-flex h-10 px-4 rounded-full bg-amber-900 text-white text-[13px] font-bold font-display items-center">Review organisers</a>
            </section>
          )}
          <section className="bg-white rounded-[28px] shadow-card p-6">
            <h2 className="font-display font-bold text-ink text-[17px] tracking-tight mb-3">By status</h2>
            <ul className="space-y-2">
              {(['draft', 'registration-open', 'published', 'upcoming', 'registration-closed', 'completed', 'cancelled'] as const).map(s => {
                const n = MOCK_TOURNAMENTS.filter(t => t.status === s).length
                return (
                  <li key={s} className="flex items-center justify-between text-[14px]">
                    <span className="text-gray-600">{statusLabel(s)}</span>
                    <span className="font-display font-bold text-ink">{n}</span>
                  </li>
                )
              })}
            </ul>
          </section>

          {(can('tournaments.create') || can('courses.create')) && <section className="bg-lime-400 rounded-[28px] p-6">
            <h2 className="font-display font-bold text-ink text-[17px] tracking-tight">Quick actions</h2>
            <div className="mt-4 space-y-2">
              {can('tournaments.create') && <a href="#/admin/tournaments/new" className="flex items-center justify-between h-12 px-4 rounded-full bg-ink text-white text-[14px] font-bold font-display hover:bg-pine-900">
                Create tournament <IconPlus />
              </a>}
              {can('courses.create') && <a href="#/admin/courses/new" className="flex items-center justify-between h-12 px-4 rounded-full bg-white text-ink text-[14px] font-bold font-display hover:bg-canvas">
                Add course <IconPlus />
              </a>}
            </div>
          </section>}
        </aside>
      </div>
    </div>
  )
}
