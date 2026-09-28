import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { PageHeader } from '../shell'
import { Button, Input, PasswordInput, SelectField, SearchInput, EmptyState } from '../components'
import { useApp } from '../app-context'
import { IconPlus, IconPencil, NoAccess, Can } from './AdminShell'
import {
  getUsers, getRoles, getRole, saveUser, setUserActive, resetPassword, useAccessVersion,
  SUPER_ADMIN_ROLE_ID, type AdminUser,
} from './access'

const initials = (name: string) => name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

function formatSignIn(iso?: string) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function randomPassword() {
  const words = ['birdie', 'eagle', 'fairway', 'green', 'links', 'mulligan', 'putter', 'wedge']
  return `${words[Math.floor(Math.random() * words.length)]}${Math.floor(100 + Math.random() * 900)}`
}

/* ───────── Modal shell ───────── */

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
        <div role="dialog" aria-modal="true" aria-label={title}
          className="pointer-events-auto bg-white rounded-[28px] shadow-2xl w-full max-w-[520px] max-h-[calc(100vh-2rem)] overflow-y-auto p-7 fade-in-up">
          <h2 className="font-display font-bold text-ink text-[21px] tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </>
  )
}

/* ───────── Add / edit user ───────── */

function UserForm({ user, onClose }: { user?: AdminUser; onClose: () => void }) {
  const { can, showToast } = useApp()
  const isNew = !user
  const canAssign = can('users.assign-role')
  const fallbackRole = getRoles().find(r => r.id === 'viewer')?.id ?? getRoles().find(r => !r.system)?.id ?? ''

  const [name, setName]         = useState(user?.name ?? '')
  const [email, setEmail]       = useState(user?.email ?? '')
  const [password, setPassword] = useState(isNew ? randomPassword() : '')
  const [roleId, setRoleId]     = useState(user?.roleId ?? (canAssign ? '' : fallbackRole))
  const [error, setError]       = useState('')

  const roleLocked = !canAssign || !!user?.system
  const selectedRole = getRole(roleId)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!roleId) { setError('Choose a role'); return }
    const r = saveUser({ id: user?.id, name, email, password, roleId })
    if (!r.ok) { setError(r.reason); return }
    showToast(isNew ? `${name.trim()} added — share their temporary password securely` : 'Admin user saved')
    onClose()
  }

  return (
    <Modal
      title={isNew ? 'Add admin user' : `Edit ${user!.name}`}
      subtitle={isNew ? 'They can sign in at the admin console with this email and password.' : user!.email}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <div role="alert" className="bg-rose-50 text-rose-700 rounded-2xl px-4 py-3 text-sm font-semibold font-display">{error}</div>}
        <Input label="Full name" placeholder="e.g. Jordan Smith" value={name} onChange={e => { setName(e.target.value); setError('') }} />
        <Input label="Email address" type="email" placeholder="name@club.com" value={email} onChange={e => { setEmail(e.target.value); setError('') }} />
        {isNew && (
          <div className="space-y-1.5">
            <PasswordInput label="Temporary password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} />
            <button type="button" onClick={() => setPassword(randomPassword())} className="text-[12px] font-semibold font-display text-gray-500 hover:text-ink">↻ Generate another</button>
          </div>
        )}
        <SelectField
          label="Role"
          placeholder="Choose a role"
          value={roleId}
          onChange={v => { setRoleId(v); setError('') }}
          options={getRoles().filter(r => !roleLocked || r.id === roleId).map(r => ({ value: r.id, label: r.name }))}
        />
        {selectedRole && <p className="text-[12px] text-gray-500 -mt-2">{selectedRole.description}</p>}
        {user?.system && <p className="text-[12px] text-gray-500">The built-in admin always keeps the Super Admin role.</p>}
        {!canAssign && !user?.system && <p className="text-[12px] text-amber-700">Your role can't assign roles, so {isNew ? 'new users get' : 'the role stays'} {selectedRole?.name ?? 'the default role'}.</p>}

        <div className="flex gap-2.5 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth>{isNew ? 'Add user' : 'Save changes'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function ResetPasswordForm({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { showToast } = useApp()
  const [password, setPassword] = useState(randomPassword())
  const [error, setError] = useState('')
  return (
    <Modal title="Reset password" subtitle={`Set a new temporary password for ${user.name}.`} onClose={onClose}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={e => {
          e.preventDefault()
          const r = resetPassword(user.id, password)
          if (!r.ok) return setError(r.reason)
          showToast(`Password reset for ${user.name}`)
          onClose()
        }}
      >
        <PasswordInput label="New password" value={password} error={error} onChange={e => { setPassword(e.target.value); setError('') }} />
        <button type="button" onClick={() => setPassword(randomPassword())} className="text-[12px] font-semibold font-display text-gray-500 hover:text-ink">↻ Generate another</button>
        <div className="flex gap-2.5 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth>Reset password</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ───────── Page ───────── */

export function AdminUsers() {
  useAccessVersion()
  const { can, adminUser, showToast, showDialog } = useApp()
  const [search, setSearch]   = useState('')
  const [roleFilter, setRF]   = useState('')
  const [status, setStatus]   = useState<'all' | 'active' | 'inactive'>('all')
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null)
  const [resetting, setResetting] = useState<AdminUser | null>(null)

  if (!can('users.view')) return <NoAccess what="view admin users" />

  const q = search.trim().toLowerCase()
  const users = getUsers().filter(u =>
    (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
    (!roleFilter || u.roleId === roleFilter) &&
    (status === 'all' || (status === 'active') === u.active))
  const all = getUsers()

  function changeRole(u: AdminUser, roleId: string) {
    const r = saveUser({ id: u.id, name: u.name, email: u.email, password: '', roleId })
    if (!r.ok) showToast(r.reason, 'error')
    else showToast(`${u.name} is now ${getRole(roleId)?.name}`)
  }

  function toggleActive(u: AdminUser) {
    if (u.active) {
      showDialog({
        title: `Deactivate ${u.name}?`,
        message: 'They will no longer be able to sign in to the admin console. You can reactivate them at any time.',
        confirmLabel: 'Deactivate',
        destructive: true,
        onConfirm: () => {
          const r = setUserActive(u.id, false, adminUser?.id)
          showToast(r.ok ? `${u.name} deactivated` : r.reason, r.ok ? 'info' : 'error')
        },
      })
    } else {
      const r = setUserActive(u.id, true)
      showToast(r.ok ? `${u.name} reactivated` : r.reason, r.ok ? 'success' : 'error')
    }
  }

  const stat = (label: string, value: number) => (
    <div className="bg-white rounded-2xl shadow-card px-5 py-4">
      <p className="text-[12px] font-semibold font-display text-gray-500">{label}</p>
      <p className="font-display font-extrabold text-ink text-[26px] leading-none tracking-tight mt-1.5">{value}</p>
    </div>
  )

  return (
    <div className="page-in">
      <PageHeader
        eyebrow="Administration"
        title="Admin users"
        actions={<Can perm="users.create"><Button onClick={() => setEditing('new')}><IconPlus /> Add admin user</Button></Can>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stat('Admin users', all.length)}
        {stat('Active', all.filter(u => u.active).length)}
        {stat('Super Admins', all.filter(u => u.roleId === SUPER_ADMIN_ROLE_ID && u.active).length)}
        {stat('Roles in use', new Set(all.map(u => u.roleId)).size)}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex-1 min-w-[240px] max-w-[380px]"><SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" /></div>
        <div className="w-[220px]">
          <select aria-label="Filter by role" value={roleFilter} onChange={e => setRF(e.target.value)}
            className="w-full h-12 rounded-full bg-white shadow-card px-5 text-[14px] font-semibold font-display text-ink border-0 appearance-none cursor-pointer">
            <option value="">All roles</option>
            {getRoles().map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s}
              className={`h-9 px-4 rounded-full text-[13px] font-semibold font-display capitalize ${status === s ? 'bg-ink text-white' : 'bg-white text-gray-600 shadow-card hover:text-ink'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[28px] shadow-card overflow-hidden">
        {users.length === 0 ? (
          <EmptyState title="No matching admin users" subtitle="Try a different search or filter."
            action={{ label: 'Clear filters', onClick: () => { setSearch(''); setRF(''); setStatus('all') } }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[12px] font-bold font-display text-gray-400 border-b border-black/[0.05]">
                  <th className="py-3.5 pl-6 pr-3 font-bold">User</th>
                  <th className="py-3.5 px-3 font-bold">Role</th>
                  <th className="py-3.5 px-3 font-bold">Status</th>
                  <th className="py-3.5 px-3 font-bold hidden md:table-cell">Last sign-in</th>
                  <th className="py-3.5 pl-3 pr-6 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {users.map(u => {
                  const isMe = u.id === adminUser?.id
                  const role = getRole(u.roleId)
                  const roleEditable = can('users.assign-role') && !u.system
                  return (
                    <tr key={u.id} className={`transition-colors hover:bg-canvas/60 ${u.active ? '' : 'opacity-60'}`}>
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold font-display flex-shrink-0 ${u.active ? 'bg-lime-300 text-ink' : 'bg-gray-200 text-gray-500'}`}>{initials(u.name)}</span>
                          <span className="min-w-0">
                            <span className="block font-display font-bold text-ink text-[14px] tracking-tight">
                              {u.name}
                              {isMe && <span className="ml-2 h-5 px-2 rounded-full bg-ink text-lime-400 text-[10px] font-bold inline-flex items-center align-middle">You</span>}
                              {u.system && <span className="ml-2 h-5 px-2 rounded-full bg-canvas text-gray-600 text-[10px] font-bold inline-flex items-center align-middle">Built-in</span>}
                            </span>
                            <span className="block text-[12px] text-gray-500">{u.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {roleEditable ? (
                          <select aria-label={`Role for ${u.name}`} value={u.roleId} onChange={e => changeRole(u, e.target.value)}
                            className="h-9 pl-3.5 pr-8 rounded-full bg-canvas text-[13px] font-semibold font-display text-ink border-0 appearance-none cursor-pointer hover:bg-gray-200"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23374151' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center',
                            }}>
                            {getRoles().map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        ) : (
                          <span className={`h-9 px-3.5 rounded-full text-[13px] font-semibold font-display inline-flex items-center ${u.roleId === SUPER_ADMIN_ROLE_ID ? 'bg-ink text-lime-400' : 'bg-canvas text-ink'}`}>
                            {role?.name ?? 'Unknown role'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`h-7 px-3 rounded-full text-[12px] font-bold font-display inline-flex items-center gap-1.5 ${u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[13px] text-gray-500 hidden md:table-cell">{formatSignIn(u.lastSignIn)}</td>
                      <td className="py-3.5 pl-3 pr-6">
                        <div className="flex justify-end gap-1.5">
                          {can('users.edit') && (
                            <>
                              <button onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`} title="Edit"
                                className="w-9 h-9 rounded-full bg-canvas text-ink flex items-center justify-center hover:bg-gray-200"><IconPencil /></button>
                              <button onClick={() => setResetting(u)} aria-label={`Reset password for ${u.name}`} title="Reset password"
                                className="w-9 h-9 rounded-full bg-canvas text-ink flex items-center justify-center hover:bg-gray-200">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M11 12l8-8M16 7l2.5 2.5M14.5 8.5L17 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                              </button>
                            </>
                          )}
                          {can('users.deactivate') && !u.system && !isMe && (
                            <button onClick={() => toggleActive(u)}
                              className={`h-9 px-3.5 rounded-full text-[12px] font-bold font-display ${u.active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                              {u.active ? 'Deactivate' : 'Reactivate'}
                            </button>
                          )}
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
      <p className="text-[12px] text-gray-400 mt-3">Each admin user has one role. Role changes take effect immediately.</p>

      {editing && <UserForm user={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {resetting && <ResetPasswordForm user={resetting} onClose={() => setResetting(null)} />}
    </div>
  )
}
