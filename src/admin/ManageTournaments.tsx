import { useState } from 'react'
import type { Tournament, TournamentStatus } from '../types'
import { MOCK_TOURNAMENTS } from '../data'
import { useDataVersion, upsertTournament, deleteTournament, setTournamentStatus, STATUS_OPTIONS } from '../store'
import { PageHeader } from '../shell'
import { Button, SearchInput, EmptyState } from '../components'
import { useApp } from '../app-context'
import { navigate } from '../router'
import { TournamentForm } from './forms'
import { IconPlus, IconPencil, IconTrash, NoAccess, Can } from './AdminShell'
import { BackLink } from '../screens/TournamentDetails'

const STATUS_TONE: Record<TournamentStatus, string> = {
  'registration-open':   'bg-emerald-50 text-emerald-700',
  'published':           'bg-amber-50 text-amber-700',
  'upcoming':            'bg-sky-50 text-sky-700',
  'registration-closed': 'bg-rose-50 text-rose-700',
  'completed':           'bg-gray-100 text-gray-600',
  'cancelled':           'bg-rose-100 text-rose-800',
}

/** Status pill that doubles as a quick status changer */
export function StatusSelect({ t }: { t: Tournament }) {
  const { showToast, can } = useApp()
  if (!can('tournaments.status')) {
    return (
      <span className={`h-8 px-3 rounded-full text-[12px] font-bold font-display inline-flex items-center ${STATUS_TONE[t.status]}`}>
        {STATUS_OPTIONS.find(o => o.value === t.status)?.label}
      </span>
    )
  }
  return (
    <select
      aria-label={`Status for ${t.name}`}
      value={t.status}
      onChange={e => {
        setTournamentStatus(t.id, e.target.value as TournamentStatus)
        showToast(`Status updated to "${STATUS_OPTIONS.find(o => o.value === e.target.value)?.label}"`)
      }}
      className={`h-8 pl-3 pr-7 rounded-full text-[12px] font-bold font-display appearance-none cursor-pointer border-0 ${STATUS_TONE[t.status]}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23374151' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
      }}
    >
      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function useConfirmDeleteTournament() {
  const { showDialog, showToast } = useApp()
  return (t: Tournament, after?: () => void) => showDialog({
    title: 'Delete tournament?',
    message: `"${t.name}" will be removed for everyone, including ${t.players} registered player${t.players === 1 ? '' : 's'}. This can't be undone.`,
    confirmLabel: 'Delete',
    destructive: true,
    onConfirm: () => { deleteTournament(t.id); showToast('Tournament deleted', 'info'); after?.() },
  })
}

/* ───────── List ───────── */

export function AdminTournaments() {
  useDataVersion()
  const { can } = useApp()
  const confirmDelete = useConfirmDeleteTournament()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | TournamentStatus>('all')

  // Recomputed every render so edits made elsewhere show up immediately (useDataVersion re-renders us)
  const q = search.trim().toLowerCase()
  const rows = MOCK_TOURNAMENTS.filter(t =>
    (status === 'all' || t.status === status) &&
    (!q || [t.name, t.venue, t.city, t.category, t.format].some(v => v.toLowerCase().includes(q))))

  return (
    <div className="page-in">
      <PageHeader
        eyebrow="Admin console"
        title="Tournaments"
        actions={<Can perm="tournaments.create"><Button onClick={() => navigate('/admin/tournaments/new')}><IconPlus /> New tournament</Button></Can>}
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex-1 min-w-[240px] max-w-[440px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search tournaments…" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS].map(o => (
            <button key={o.value} onClick={() => setStatus(o.value as typeof status)} aria-pressed={status === o.value}
              className={`h-9 px-4 rounded-full text-[13px] font-semibold font-display whitespace-nowrap transition-colors ${
                status === o.value ? 'bg-ink text-white' : 'bg-white text-gray-600 shadow-card hover:text-ink'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[28px] shadow-card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            title={MOCK_TOURNAMENTS.length ? 'No matching tournaments' : 'No tournaments yet'}
            subtitle={MOCK_TOURNAMENTS.length ? 'Try a different search or status.' : 'Create your first tournament to publish it to golfers.'}
            action={MOCK_TOURNAMENTS.length
              ? { label: 'Clear filters', onClick: () => { setSearch(''); setStatus('all') } }
              : can('tournaments.create') ? { label: 'New tournament', onClick: () => navigate('/admin/tournaments/new') } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[12px] font-bold font-display text-gray-400 border-b border-black/[0.05]">
                  <th className="py-3.5 pl-6 pr-3 font-bold">Tournament</th>
                  <th className="py-3.5 px-3 font-bold">Dates</th>
                  <th className="py-3.5 px-3 font-bold hidden xl:table-cell">Course</th>
                  <th className="py-3.5 px-3 font-bold">Players</th>
                  <th className="py-3.5 px-3 font-bold">Status</th>
                  <th className="py-3.5 pl-3 pr-6 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {rows.map(t => {
                  const pct = Math.min(100, Math.round((t.players / t.maxPlayers) * 100))
                  return (
                    <tr key={t.id} className="hover:bg-canvas/60 transition-colors">
                      <td className="py-3.5 pl-6 pr-3">
                        <a href={`#/admin/tournaments/${t.id}`} className="flex items-center gap-3 group">
                          <img src={t.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                          <span className="min-w-0">
                            <span className="block font-display font-bold text-ink text-[14px] tracking-tight group-hover:underline decoration-lime-500 decoration-2 underline-offset-4">{t.name}</span>
                            <span className="block text-[12px] text-gray-500">{t.format} · {t.category}</span>
                          </span>
                        </a>
                      </td>
                      <td className="py-3.5 px-3 text-[13px] text-ink whitespace-nowrap">{t.dateRange}</td>
                      <td className="py-3.5 px-3 text-[13px] text-gray-600 hidden xl:table-cell">{t.venue}</td>
                      <td className="py-3.5 px-3 w-36">
                        <p className="text-[12px] font-semibold text-gray-600">{t.players} / {t.maxPlayers}</p>
                        <div className="h-1.5 bg-canvas rounded-full overflow-hidden mt-1"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-400' : 'bg-lime-500'}`} style={{ width: `${pct}%` }} /></div>
                      </td>
                      <td className="py-3.5 px-3"><StatusSelect t={t} /></td>
                      <td className="py-3.5 pl-3 pr-6">
                        <div className="flex justify-end gap-1.5">
                          {can('tournaments.edit') ? (
                            <a href={`#/admin/tournaments/${t.id}`} aria-label={`Edit ${t.name}`} title="Edit"
                              className="w-9 h-9 rounded-full bg-canvas text-ink flex items-center justify-center hover:bg-gray-200"><IconPencil /></a>
                          ) : (
                            <a href={`#/admin/tournaments/${t.id}`} aria-label={`View ${t.name}`}
                              className="h-9 px-3.5 rounded-full bg-canvas text-ink text-[12px] font-bold font-display flex items-center hover:bg-gray-200">View</a>
                          )}
                          {can('tournaments.delete') && <button onClick={() => confirmDelete(t)} aria-label={`Delete ${t.name}`} title="Delete"
                            className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100"><IconTrash /></button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[12px] text-gray-400 mt-3">{rows.length} of {MOCK_TOURNAMENTS.length} tournaments · changes are saved in this browser</p>
    </div>
  )
}

/* ───────── Create / edit ───────── */

export function AdminTournamentEditor({ id }: { id: string | null }) {
  useDataVersion()
  const { showToast, can } = useApp()
  const confirmDelete = useConfirmDeleteTournament()
  const existing = id ? MOCK_TOURNAMENTS.find(t => t.id === id) : undefined

  if (id && !existing) {
    return (
      <div className="bg-white rounded-[32px] shadow-card">
        <EmptyState title="Tournament not found" subtitle="It may have been deleted."
          action={{ label: 'Back to tournaments', onClick: () => navigate('/admin/tournaments') }} />
      </div>
    )
  }

  const isNew = !existing
  const done = () => navigate('/admin/tournaments')
  if (isNew && !can('tournaments.create')) return <NoAccess what="create tournaments" />
  if (!can('tournaments.view')) return <NoAccess what="view tournaments" />
  const readOnly = !isNew && !can('tournaments.edit')

  return (
    <div className="page-in max-w-[920px]">
      <BackLink label="Tournaments" onClick={done} />
      <PageHeader
        eyebrow={isNew ? 'Create' : readOnly ? 'View only' : 'Edit'}
        title={isNew ? 'New tournament' : existing.name}
        actions={!isNew && can('tournaments.delete') && (
          <button onClick={() => confirmDelete(existing, done)}
            className="h-11 px-4 rounded-full bg-rose-50 text-rose-600 text-[14px] font-bold font-display flex items-center gap-2 hover:bg-rose-100">
            <IconTrash /> Delete
          </button>
        )}
      />

      <TournamentForm
        key={existing?.id ?? 'new'}
        formId="tournament-form"
        initial={existing}
        readOnly={readOnly}
        onSave={t => {
          upsertTournament(t)
          showToast(isNew ? `"${t.name}" created` : 'Tournament saved')
          done()
        }}
      />

      {readOnly ? (
        <p className="mt-6 text-[13px] text-gray-500">Your role can view this tournament but not change it.</p>
      ) : (
      <div className="sticky bottom-4 mt-8 z-10">
        <div className="bg-ink rounded-full shadow-float p-2 pl-6 flex items-center gap-3">
          <p className="flex-1 text-[13px] font-medium text-white/60 truncate">
            {isNew ? 'New tournaments appear to golfers as soon as you save' : 'Changes are visible to golfers as soon as you save'}
          </p>
          <button type="button" onClick={done} className="h-11 px-5 rounded-full text-white/80 text-sm font-semibold font-display hover:bg-white/10">Cancel</button>
          <Button type="submit" form="tournament-form" className="bg-lime-400! text-ink! shadow-none!">
            {isNew ? 'Create tournament' : 'Save changes'}
          </Button>
        </div>
      </div>
      )}
    </div>
  )
}
