import { useState, type FormEvent, type ReactNode } from 'react'
import type { Route } from '../router'
import { useApp } from '../app-context'
import { AuthLayout, Wordmark } from '../shell'
import { Button, Input, PasswordInput, IconSignOut } from '../components'
import { isAdminLogin, resetDemoData, ADMIN_EMAIL } from '../store'

/* ───────── Icons (currentColor so the nav can tint them) ───────── */

export function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7.5" height="9" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="3" y="15" width="7.5" height="6" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  )
}
export function IconTrophy() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M7 3h10v6a5 5 0 01-10 0V3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M7 6H4a2 2 0 000 4h3M17 6h3a2 2 0 010 4h-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
export function IconFlag() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M6 21V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M6 4h11l-2.5 4L17 12H6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <ellipse cx="11" cy="20" rx="6" ry="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}
export function IconPlus() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3.5v11M3.5 9h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}
export function IconPencil() {
  return <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M12.5 2.5l3 3L5 16H2v-3L12.5 2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}
export function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M3 5h12M7 5V3.5h4V5M5 5l.7 10a1 1 0 001 1h4.6a1 1 0 001-1L13 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ───────── Admin sign-in ───────── */

export function AdminLogin() {
  const { signInAdmin } = useApp()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Enter the admin email and password'); return }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      if (isAdminLogin(email, password)) signInAdmin()
      else setError('Invalid admin credentials')
    }, 900)
  }

  return (
    <AuthLayout
      headline={<>Run your<br /><span className="text-lime-400">tournaments.</span></>}
      sub="The admin console for organisers — create events, manage courses and keep registrations on track."
    >
      <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-ink text-lime-400 text-[12px] font-bold font-display">
        <span className="w-1.5 h-1.5 rounded-full bg-lime-400" /> Admin console
      </span>
      <h2 className="font-display font-extrabold text-ink text-[32px] tracking-tight mt-4">Admin sign in</h2>
      <p className="text-gray-500 text-[15px] mt-1">For tournament organisers and staff</p>

      {error && (
        <div role="alert" className="mt-6 flex items-center gap-3 bg-rose-50 rounded-2xl px-4 py-3.5 fade-in">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
            <circle cx="9" cy="9" r="8" stroke="#dc2626" strokeWidth="1.3" fill="#fef2f2"/>
            <path d="M6 6l6 6M12 6l-6 6" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <p className="text-sm font-semibold text-rose-700 font-display">{error}</p>
        </div>
      )}

      <form onSubmit={submit} noValidate className="flex flex-col gap-4 mt-8">
        <Input label="Admin email" type="email" placeholder={ADMIN_EMAIL} value={email}
          onChange={e => { setEmail(e.target.value); setError('') }} autoComplete="username" onCanvas />
        <PasswordInput label="Password" placeholder="Enter admin password" value={password}
          onChange={e => { setPassword(e.target.value); setError('') }} autoComplete="current-password" onCanvas />
        <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
          {loading ? 'Signing in…' : 'Sign in to admin'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-7">
        Not an organiser?{' '}
        <a href="#/signin" className="text-ink font-semibold font-display underline underline-offset-4 decoration-lime-500 decoration-2 hover:opacity-70">
          Golfer sign in
        </a>
      </p>
    </AuthLayout>
  )
}

/* ───────── Admin layout ───────── */

const NAV = [
  { label: 'Dashboard',   href: '#/admin',             Icon: IconDashboard, match: ['admin'] },
  { label: 'Tournaments', href: '#/admin/tournaments', Icon: IconTrophy,    match: ['admin-tournaments', 'admin-tournament-edit'] },
  { label: 'Courses',     href: '#/admin/courses',     Icon: IconFlag,      match: ['admin-courses', 'admin-course-edit'] },
]

function useResetDemo() {
  const { showDialog, showToast } = useApp()
  return () => showDialog({
    title: 'Reset demo data?',
    message: 'This restores the original tournaments and courses and removes every change made in the admin console on this device.',
    confirmLabel: 'Reset data',
    destructive: true,
    onConfirm: () => { resetDemoData(); showToast('Demo data restored', 'info') },
  })
}

export function AdminLayout({ route, children }: { route: Route; children: ReactNode }) {
  const { signOut } = useApp()
  const reset = useResetDemo()

  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[264px] flex-col bg-ink p-5 z-30">
        <div className="px-2 pt-1"><Wordmark dark /></div>
        <span className="mx-2 mt-4 self-start inline-flex items-center gap-2 h-7 px-3 rounded-full bg-lime-400/15 text-lime-400 text-[11px] font-bold font-display tracking-wide uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-lime-400" /> Admin console
        </span>

        <nav className="mt-8 flex flex-col gap-1.5" aria-label="Admin">
          {NAV.map(({ label, href, Icon, match }) => {
            const active = match.includes(route.name)
            return (
              <a key={label} href={href} aria-current={active ? 'page' : undefined}
                className={`h-12 px-4 rounded-full flex items-center gap-3 font-display font-bold text-[14px] tracking-tight transition-colors ${
                  active ? 'bg-lime-400 text-ink' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                }`}>
                <Icon />{label}
              </a>
            )
          })}
        </nav>

        <button onClick={reset} className="mt-auto h-10 px-4 rounded-full text-left text-white/50 hover:text-white hover:bg-white/[0.06] text-[13px] font-semibold font-display transition-colors">
          ↺ Reset demo data
        </button>
        <div className="mt-3 flex items-center gap-3 rounded-full bg-white/[0.06] p-1.5 pr-2">
          <span className="w-9 h-9 rounded-full bg-lime-400 flex items-center justify-center font-display font-extrabold text-ink text-[13px]">A</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-bold font-display">Administrator</p>
            <p className="text-white/45 text-[11px] truncate">{ADMIN_EMAIL}</p>
          </div>
          <button onClick={signOut} aria-label="Sign out" title="Sign out" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <IconSignOut />
          </button>
        </div>
      </aside>

      {/* Compact top bar below lg */}
      <header className="lg:hidden sticky top-0 z-30 bg-ink">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <Wordmark dark />
          <button onClick={signOut} className="h-9 px-4 rounded-full bg-white/10 text-white text-[13px] font-bold font-display">Sign out</button>
        </div>
        <nav className="flex gap-1.5 px-4 sm:px-6 pb-3" aria-label="Admin">
          {NAV.map(({ label, href, match }) => {
            const active = match.includes(route.name)
            return (
              <a key={label} href={href} aria-current={active ? 'page' : undefined}
                className={`h-9 px-4 rounded-full flex items-center text-[13px] font-bold font-display ${active ? 'bg-lime-400 text-ink' : 'bg-white/10 text-white/70'}`}>
                {label}
              </a>
            )
          })}
        </nav>
      </header>

      <main className="lg:pl-[264px]">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">{children}</div>
      </main>
    </div>
  )
}
