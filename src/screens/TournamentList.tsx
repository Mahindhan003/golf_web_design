import { useEffect, useMemo, useRef, useState } from 'react'
import type { TournamentStatus } from '../types'
import { SearchInput, TournamentCard, SkeletonCard, EmptyState, Button } from '../components'
import { publicTournaments } from '../admin/access'
import { PageHeader, useFakeLoad } from '../shell'
import { navigate } from '../router'

type Filter = 'All' | 'Open' | 'Upcoming' | 'Completed' | 'Cancelled'

const FILTERS: Filter[] = ['All', 'Open', 'Upcoming', 'Completed', 'Cancelled']

const FILTER_STATUS: Record<Filter, TournamentStatus[]> = {
  All:       [],
  Open:      ['registration-open'],
  Upcoming:  ['upcoming', 'published'],
  Completed: ['completed'],
  Cancelled: ['cancelled'],
}

function countFor(filter: Filter) {
  return filter === 'All'
    ? publicTournaments().length
    : publicTournaments().filter(t => FILTER_STATUS[filter].includes(t.status)).length
}

/* ───────── Filter dropdown ───────── */

function FilterMenu({ value, onApply, onClose }: { value: Filter; onApply: (f: Filter) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Filter>(value)
  const count = countFor(draft)

  return (
    <div role="dialog" aria-label="Filters" className="absolute right-0 top-[calc(100%+10px)] z-20 w-[340px] bg-white rounded-[28px] shadow-2xl p-5 pop-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-extrabold text-ink text-[18px] tracking-tight">Filters</h2>
        <button onClick={() => setDraft('All')} className="text-[13px] font-semibold font-display text-gray-500 hover:text-ink">Reset</button>
      </div>

      <p className="text-[13px] font-bold text-gray-500 font-display mb-2">Status</p>
      <div className="bg-canvas rounded-3xl p-1.5 space-y-1">
        {FILTERS.map(f => {
          const selected = draft === f
          return (
            <button
              key={f}
              onClick={() => setDraft(f)}
              aria-pressed={selected}
              className={`w-full flex items-center gap-3 h-11 px-4 rounded-2xl transition-all ${selected ? 'bg-white shadow-card' : 'hover:bg-white/60'}`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                <path d="M6 4l4 4-4 4" stroke={selected ? '#0c1a12' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="flex-1 text-left text-[14px] font-semibold font-display text-ink">{f === 'All' ? 'All tournaments' : f}</span>
              <span className="text-[12px] font-semibold text-gray-400">{countFor(f)}</span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${selected ? 'bg-ink' : 'border-2 border-black/15'}`}>
                {selected && <span className="w-2 h-2 rounded-full bg-lime-400" />}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" fullWidth onClick={() => onApply(draft)}>Show {count} result{count !== 1 ? 's' : ''}</Button>
      </div>
    </div>
  )
}

export default function TournamentList() {
  const loading = useFakeLoad(800)
  const [search, setSearch]       = useState('')
  const [activeFilter, setFilter] = useState<Filter>('All')
  const [menuOpen, setMenuOpen]   = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the dropdown on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    const onKey  = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  const filtered = useMemo(() => {
    let list = publicTournaments()
    if (activeFilter !== 'All') list = list.filter(t => FILTER_STATUS[activeFilter].includes(t.status))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) || t.venue.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) || t.format.toLowerCase().includes(q))
    }
    return list
  }, [search, activeFilter])

  return (
    <div className="page-in">
      <PageHeader eyebrow="Find your next event" title="Tournaments" />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[240px] max-w-[520px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, venue, city or format…" />
        </div>
        <div className="relative ml-auto" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className="relative h-12 pl-4 pr-5 flex items-center gap-2.5 rounded-full bg-ink text-white font-display font-bold text-[14px] hover:bg-pine-900 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M2.5 5.5h15M5.5 10h9M8 14.5h4" stroke="#c8ec5a" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Filters
            {activeFilter !== 'All' && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-lime-400 ring-2 ring-canvas" />}
          </button>
          {menuOpen && (
            <FilterMenu
              value={activeFilter}
              onApply={f => { setFilter(f); setMenuOpen(false) }}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 min-h-8">
        {activeFilter !== 'All' && (
          <button
            onClick={() => setFilter('All')}
            className="inline-flex items-center gap-2 h-8 pl-3 pr-2 rounded-full bg-ink text-white text-[12px] font-semibold font-display hover:bg-pine-900"
          >
            {activeFilter}
            <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center text-[10px] leading-none">✕</span>
          </button>
        )}
        {!loading && (
          <p className="text-[13px] text-gray-500 font-semibold font-display">
            {filtered.length} tournament{filtered.length !== 1 ? 's' : ''}{search ? ` · "${search}"` : ''}
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[32px] shadow-card">
          {search ? (
            <EmptyState
              title="No results found"
              subtitle={`No tournaments match "${search}". Try different keywords or clear your search.`}
              action={{ label: 'Clear search', onClick: () => setSearch('') }}
            />
          ) : (
            <EmptyState
              title={`No ${activeFilter.toLowerCase()} tournaments`}
              subtitle="There are no tournaments in this category right now. Check back soon."
              action={{ label: 'View all', onClick: () => setFilter('All') }}
            />
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(t => (
            <TournamentCard key={t.id} tournament={t} onPress={() => navigate(`/tournaments/${t.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
