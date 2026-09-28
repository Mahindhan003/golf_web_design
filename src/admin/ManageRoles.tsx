import { useState, type FormEvent } from 'react'
import { PageHeader } from '../shell'
import { Button, Input, SelectField } from '../components'
import { useApp } from '../app-context'
import { navigate } from '../router'
import { BackLink } from '../screens/TournamentDetails'
import { IconPlus, IconPencil, IconTrash, NoAccess, Can } from './AdminShell'
import {
  PERMISSION_CATALOG, STANDARD_ACTIONS, ACTION_LABELS, ALL_PERMISSIONS, permKey,
  getRoles, getRole, usersWithRole, rolePermissions, saveRole, deleteRole, useAccessVersion,
  type ActionKey, type Role, type ScreenDef,
} from './access'

/* Duplicate → editor hand-off (keeps the hash URL clean) */
let pendingCopyFrom: string | null = null

function useConfirmDeleteRole() {
  const { showDialog, showToast } = useApp()
  return (role: Role, after?: () => void) => {
    const n = usersWithRole(role.id).length
    if (n) {
      showDialog({
        title: "Can't delete this role",
        message: `${n} admin user${n > 1 ? 's have' : ' has'} the ${role.name} role. Give ${n > 1 ? 'them' : 'them'} another role first.`,
        confirmLabel: 'View admin users',
        cancelLabel: 'OK',
        onConfirm: () => navigate('/admin/users'),
      })
      return
    }
    showDialog({
      title: 'Delete role?',
      message: `"${role.name}" and its permissions will be removed. This can't be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        const r = deleteRole(role.id)
        if (r.ok) { showToast('Role deleted', 'info'); after?.() }
        else showToast(r.reason, 'error')
      },
    })
  }
}

/** Short per-module summary, e.g. "Tournaments · Full" */
function accessSummary(perms: string[]) {
  const set = new Set(perms)
  return PERMISSION_CATALOG.flatMap(m => m.screens).map(s => {
    const have = s.actions.filter(a => set.has(permKey(s.key, a)))
    const level = have.length === 0 ? 'none' : have.length === s.actions.length ? 'full' : have.length === 1 && have[0] === 'view' ? 'view' : 'partial'
    return { screen: s, level }
  }).filter(x => x.level !== 'none')
}

const LEVEL_STYLE: Record<string, string> = {
  full: 'bg-lime-400 text-ink',
  partial: 'bg-ink text-white',
  view: 'bg-canvas text-gray-600',
}
const LEVEL_LABEL: Record<string, string> = { full: 'Full', partial: 'Partial', view: 'View only' }

/* ───────── List ───────── */

export function AdminRoles() {
  useAccessVersion()
  const { can } = useApp()
  const confirmDelete = useConfirmDeleteRole()
  if (!can('roles.view')) return <NoAccess what="view roles" />

  const roles = getRoles()

  return (
    <div className="page-in">
      <PageHeader
        eyebrow="Administration"
        title="Roles & permissions"
        actions={<Can perm="roles.create"><Button onClick={() => { pendingCopyFrom = null; navigate('/admin/roles/new') }}><IconPlus /> New role</Button></Can>}
      />
      <p className="text-gray-500 -mt-4 mb-8 max-w-2xl">
        A role is a set of permissions. Give each admin user one role to control which screens they can open and what they can change.
      </p>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {roles.map(role => {
          const perms = rolePermissions(role.id)
          const users = usersWithRole(role.id)
          const pct = Math.round((perms.length / ALL_PERMISSIONS.length) * 100)
          const summary = accessSummary(perms)
          return (
            <article key={role.id} className={`rounded-[28px] p-6 flex flex-col ${role.system ? 'bg-ink text-white shadow-float relative overflow-hidden' : 'bg-white shadow-card'}`}>
              {role.system && (
                <div className="absolute inset-y-0 right-0 w-[70%] pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, rgba(200,236,90,0) 0%, rgba(200,236,90,0.10) 40%, rgba(200,236,90,0.22) 100%)' }} />
              )}
              <div className="relative flex items-start justify-between gap-3">
                <h2 className={`font-display font-bold text-[19px] tracking-tight ${role.system ? 'text-white' : 'text-ink'}`}>{role.name}</h2>
                {role.system && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-lime-400 text-ink text-[11px] font-bold font-display">System</span>
                )}
              </div>
              <p className={`relative text-[13px] mt-1 leading-relaxed min-h-[40px] ${role.system ? 'text-white/60' : 'text-gray-500'}`}>
                {role.description || 'No description'}
              </p>

              <div className="relative mt-4">
                <div className={`flex justify-between text-[12px] font-semibold mb-1.5 ${role.system ? 'text-white/60' : 'text-gray-500'}`}>
                  <span>{perms.length} of {ALL_PERMISSIONS.length} permissions</span><span>{pct}%</span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${role.system ? 'bg-white/10' : 'bg-canvas'}`}>
                  <div className="h-full rounded-full bg-lime-500" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {!role.system && (
                <div className="relative flex flex-wrap gap-1.5 mt-4">
                  {summary.length === 0
                    ? <span className="text-[12px] text-gray-400">No access yet</span>
                    : summary.map(({ screen, level }) => (
                      <span key={screen.key} className={`h-6 px-2.5 rounded-full text-[11px] font-semibold font-display inline-flex items-center ${LEVEL_STYLE[level]}`}>
                        {screen.name} · {LEVEL_LABEL[level]}
                      </span>
                    ))}
                </div>
              )}

              <div className="relative flex items-center gap-2 mt-auto pt-5">
                <div className="flex -space-x-2 mr-auto">
                  {users.slice(0, 4).map(u => (
                    <span key={u.id} title={u.name}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold font-display ring-2 ${role.system ? 'ring-ink' : 'ring-white'} ${u.active ? 'bg-lime-300 text-ink' : 'bg-gray-200 text-gray-500'}`}>
                      {u.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('')}
                    </span>
                  ))}
                  {users.length === 0 && <span className={`text-[12px] ${role.system ? 'text-white/50' : 'text-gray-400'}`}>No users</span>}
                  {users.length > 4 && <span className="w-8 h-8 rounded-full bg-canvas text-gray-600 text-[11px] font-bold flex items-center justify-center ring-2 ring-white">+{users.length - 4}</span>}
                </div>

                <a href={`#/admin/roles/${role.id}`} aria-label={`${role.system || !can('roles.edit') ? 'View' : 'Edit'} ${role.name}`}
                  className={`h-9 px-3.5 rounded-full text-[13px] font-bold font-display inline-flex items-center gap-1.5 ${role.system ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-canvas text-ink hover:bg-gray-200'}`}>
                  {role.system || !can('roles.edit') ? 'View' : <><IconPencil /> Edit</>}
                </a>
                {!role.system && can('roles.create') && (
                  <button onClick={() => { pendingCopyFrom = role.id; navigate('/admin/roles/new') }} aria-label={`Duplicate ${role.name}`} title="Duplicate"
                    className="w-9 h-9 rounded-full bg-canvas text-ink flex items-center justify-center hover:bg-gray-200">
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="6" y="6" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M12 6V4.5A1.5 1.5 0 0010.5 3h-6A1.5 1.5 0 003 4.5v6A1.5 1.5 0 004.5 12H6" stroke="currentColor" strokeWidth="1.6"/></svg>
                  </button>
                )}
                {!role.system && can('roles.delete') && (
                  <button onClick={() => confirmDelete(role)} aria-label={`Delete ${role.name}`} title="Delete"
                    className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100"><IconTrash /></button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── Permission grid pieces ───────── */

function Check({ on, onToggle, disabled, label }: { on: boolean; onToggle: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
        on ? 'bg-ink' : 'bg-white border-2 border-black/15'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
    >
      {on && (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="#c8ec5a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )}
    </button>
  )
}

function Switch({ on, onToggle, disabled, label }: { on: boolean; onToggle: () => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-lime-500' : 'bg-black/15'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

/* ───────── Editor ───────── */

export function AdminRoleEditor({ id }: { id: string | null }) {
  useAccessVersion()
  const { can, showToast, adminUser } = useApp()
  const confirmDelete = useConfirmDeleteRole()
  const existing = id ? getRole(id) : undefined

  const [copyFrom] = useState(() => { const c = pendingCopyFrom; pendingCopyFrom = null; return c })
  const source = existing ?? (copyFrom ? getRole(copyFrom) : undefined)

  const [name, setName]         = useState(existing?.name ?? (source ? `${source.name} (copy)` : ''))
  const [description, setDesc]  = useState(existing?.description ?? source?.description ?? '')
  const [perms, setPerms]       = useState<Set<string>>(() => new Set(source ? rolePermissions(source.id) : ['dashboard.view']))
  const [error, setError]       = useState('')

  if (id && !existing) {
    return (
      <div className="bg-white rounded-[32px] shadow-card p-12 text-center">
        <p className="font-display font-bold text-ink text-[20px]">Role not found</p>
        <Button className="mt-5" variant="secondary" onClick={() => navigate('/admin/roles')}>Back to roles</Button>
      </div>
    )
  }
  if (!can('roles.view')) return <NoAccess what="view roles" />
  if (!existing && !can('roles.create')) return <NoAccess what="create roles" />

  const isNew = !existing
  const readOnly = !!existing?.system || (!isNew && !can('roles.edit'))
  const done = () => navigate('/admin/roles')
  const assigned = existing ? usersWithRole(existing.id) : []
  const editingOwnRole = !!existing && adminUser?.roleId === existing.id

  const has = (k: string) => perms.has(k)
  const update = (fn: (next: Set<string>) => void) => { if (readOnly) return; const next = new Set(perms); fn(next); setPerms(next) }

  function toggle(screen: ScreenDef, action: ActionKey) {
    update(next => {
      const k = permKey(screen.key, action)
      if (next.has(k)) {
        next.delete(k)
        // Removing View removes everything else on that screen
        if (action === 'view') screen.actions.forEach(a => next.delete(permKey(screen.key, a)))
      } else {
        next.add(k)
        // Any action needs View to reach the screen
        if (action !== 'view' && screen.actions.includes('view')) next.add(permKey(screen.key, 'view'))
      }
    })
  }

  function setScreenAll(screen: ScreenDef, on: boolean) {
    update(next => screen.actions.forEach(a => (on ? next.add(permKey(screen.key, a)) : next.delete(permKey(screen.key, a)))))
  }

  function setModuleAll(screens: ScreenDef[], on: boolean) {
    update(next => screens.forEach(s => s.actions.forEach(a => (on ? next.add(permKey(s.key, a)) : next.delete(permKey(s.key, a))))))
  }

  function copyPermissionsFrom(roleId: string) {
    if (!roleId) return
    setPerms(new Set(rolePermissions(roleId)))
    showToast(`Copied permissions from ${getRole(roleId)?.name}`, 'info')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    if (!name.trim()) { setError('Role name is required'); return }
    const r = saveRole({ id: existing?.id, name, description, permissions: [...perms] })
    if (!r.ok) { setError(r.reason); return }
    showToast(isNew ? `"${name.trim()}" created` : 'Role saved')
    done()
  }

  const total = perms.size

  return (
    <form onSubmit={submit} noValidate className="page-in">
      <BackLink label="Roles & permissions" onClick={done} />
      <PageHeader
        eyebrow={isNew ? 'Create role' : readOnly ? 'View role' : 'Edit role'}
        title={isNew ? (name.trim() || 'New role') : existing!.name}
        actions={!isNew && !existing!.system && can('roles.delete') && (
          <button type="button" onClick={() => confirmDelete(existing!, done)}
            className="h-11 px-4 rounded-full bg-rose-50 text-rose-600 text-[14px] font-bold font-display flex items-center gap-2 hover:bg-rose-100">
            <IconTrash /> Delete
          </button>
        )}
      />

      {existing?.system && (
        <div className="mb-6 flex items-center gap-3 bg-ink text-white rounded-2xl px-5 py-4">
          <span className="w-2 h-2 rounded-full bg-lime-400 flex-shrink-0" />
          <p className="text-[14px]">Super Admin is a system role. It always has every permission and can't be edited or deleted.</p>
        </div>
      )}
      {editingOwnRole && !readOnly && (
        <div className="mb-6 bg-amber-50 text-amber-800 rounded-2xl px-5 py-4 text-[14px]">
          This is your own role. Removing permissions here will also limit what you can do after saving.
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="space-y-5">
          {/* Details */}
          <section className="bg-white rounded-[28px] shadow-card p-6">
            <h2 className="font-display font-bold text-ink text-[18px] tracking-tight mb-4">Role details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Role name" placeholder="e.g. Tournament Director" value={name} disabled={readOnly}
                onChange={e => { setName(e.target.value); setError('') }} error={error} />
              <Input label="Description" placeholder="What is this role for?" value={description} disabled={readOnly}
                onChange={e => setDesc(e.target.value)} />
            </div>
          </section>

          {/* Permission grids, one card per module */}
          {PERMISSION_CATALOG.map(mod => {
            const keys = mod.screens.flatMap(s => s.actions.map(a => permKey(s.key, a)))
            const on = keys.filter(has).length
            const allOn = on === keys.length
            const extraActions = (s: ScreenDef) => s.actions.filter(a => !STANDARD_ACTIONS.includes(a))
            return (
              <section key={mod.name} className="bg-white rounded-[28px] shadow-card overflow-hidden">
                <header className="flex items-center justify-between gap-4 px-6 pt-5 pb-4">
                  <div>
                    <h2 className="font-display font-bold text-ink text-[18px] tracking-tight">{mod.name}</h2>
                    <p className="text-[12px] font-semibold text-gray-500 mt-0.5">{on} of {keys.length} permissions</p>
                  </div>
                  <label className="flex items-center gap-2.5 text-[13px] font-semibold font-display text-gray-600">
                    Select all
                    <Switch on={allOn} disabled={readOnly} label={`Select all ${mod.name} permissions`} onToggle={() => setModuleAll(mod.screens, !allOn)} />
                  </label>
                </header>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[12px] font-bold font-display text-gray-400 border-y border-black/[0.05] bg-canvas/50">
                        <th className="py-2.5 pl-6 pr-3 text-left font-bold">Screen</th>
                        {STANDARD_ACTIONS.map(a => <th key={a} className="py-2.5 px-2 w-[76px] font-bold">{ACTION_LABELS[a]}</th>)}
                        <th className="py-2.5 pl-2 pr-6 w-[64px] font-bold">All</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05]">
                      {mod.screens.map(screen => {
                        const screenKeys = screen.actions.map(a => permKey(screen.key, a))
                        const screenAll = screenKeys.every(has)
                        const extras = extraActions(screen)
                        return (
                          <tr key={screen.key} className="align-top">
                            <td className="py-4 pl-6 pr-3">
                              <p className="font-display font-bold text-ink text-[14px] tracking-tight">{screen.name}</p>
                              <p className="text-[12px] text-gray-500">{screen.description}</p>
                              {extras.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                  {extras.map(a => {
                                    const k = permKey(screen.key, a)
                                    const active = has(k)
                                    return (
                                      <button key={a} type="button" role="checkbox" aria-checked={active} aria-label={`${screen.name}: ${ACTION_LABELS[a]}`}
                                        disabled={readOnly} onClick={() => toggle(screen, a)}
                                        className={`h-8 pl-2 pr-3 rounded-full inline-flex items-center gap-1.5 text-[12px] font-semibold font-display transition-colors ${
                                          active ? 'bg-ink text-white' : 'bg-canvas text-gray-600 hover:bg-gray-200'
                                        } ${readOnly ? 'cursor-not-allowed' : ''}`}>
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center ${active ? 'bg-lime-400' : 'border-2 border-black/20'}`}>
                                          {active && <svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="#0c1a12" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                        </span>
                                        {ACTION_LABELS[a]}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </td>
                            {STANDARD_ACTIONS.map(a => (
                              <td key={a} className="py-4 px-2">
                                <div className="flex justify-center">
                                  {screen.actions.includes(a)
                                    ? <Check on={has(permKey(screen.key, a))} disabled={readOnly} label={`${screen.name}: ${ACTION_LABELS[a]}`} onToggle={() => toggle(screen, a)} />
                                    : <span className="text-gray-300 text-[13px] h-7 flex items-center">—</span>}
                                </div>
                              </td>
                            ))}
                            <td className="py-4 pl-2 pr-6">
                              <div className="flex justify-center">
                                <Switch on={screenAll} disabled={readOnly} label={`All ${screen.name} permissions`} onToggle={() => setScreenAll(screen, !screenAll)} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-8 space-y-5">
          <section className="bg-ink rounded-[28px] p-6 text-white relative overflow-hidden">
            <div className="absolute inset-y-0 right-0 w-[70%] pointer-events-none"
              style={{ background: 'linear-gradient(90deg, rgba(200,236,90,0) 0%, rgba(200,236,90,0.12) 40%, rgba(200,236,90,0.26) 100%)' }} />
            <p className="relative text-white/55 text-[13px] font-semibold font-display">Permissions granted</p>
            <p className="relative font-display font-extrabold text-lime-400 text-[44px] leading-none tracking-tight mt-1">
              {total}<span className="text-white/40 text-[20px]"> / {ALL_PERMISSIONS.length}</span>
            </p>
            <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-lime-400 rounded-full transition-all" style={{ width: `${(total / ALL_PERMISSIONS.length) * 100}%` }} />
            </div>
            <p className="relative text-[12px] text-white/50 mt-3">Choosing Create, Edit or Delete also grants View on that screen.</p>
          </section>

          {!readOnly && (
            <section className="bg-white rounded-[28px] shadow-card p-6">
              <SelectField
                label="Copy permissions from"
                placeholder="Choose a role…"
                value=""
                onChange={copyPermissionsFrom}
                options={getRoles().filter(r => r.id !== existing?.id).map(r => ({ value: r.id, label: r.name }))}
              />
              <p className="text-[12px] text-gray-500 mt-2">Replaces the current selection. Nothing is saved until you click Save.</p>
            </section>
          )}

          {!isNew && (
            <section className="bg-white rounded-[28px] shadow-card p-6">
              <h3 className="font-display font-bold text-ink text-[16px] tracking-tight">Users with this role</h3>
              {assigned.length === 0 ? (
                <p className="text-[13px] text-gray-500 mt-2">No admin users have this role yet.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {assigned.map(u => (
                    <li key={u.id} className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold font-display ${u.active ? 'bg-lime-300 text-ink' : 'bg-gray-200 text-gray-500'}`}>
                        {u.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('')}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-ink truncate">{u.name}{!u.active && <span className="text-gray-400 font-normal"> · inactive</span>}</span>
                        <span className="block text-[12px] text-gray-500 truncate">{u.email}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {can('users.view') && <a href="#/admin/users" className="inline-block mt-4 text-[13px] font-semibold font-display text-gray-500 hover:text-ink">Manage admin users →</a>}
            </section>
          )}
        </aside>
      </div>

      {!readOnly && (
        <div className="sticky bottom-4 mt-8 z-10">
          <div className="bg-ink rounded-full shadow-float p-2 pl-6 flex items-center gap-3">
            <p className="flex-1 text-[13px] font-medium text-white/60 truncate">
              {error ? <span className="text-rose-300">{error}</span>
                : `${total} permission${total === 1 ? '' : 's'} selected${assigned.length ? ` · applies to ${assigned.length} user${assigned.length === 1 ? '' : 's'} immediately` : ''}`}
            </p>
            <button type="button" onClick={done} className="h-11 px-5 rounded-full text-white/80 text-sm font-semibold font-display hover:bg-white/10">Cancel</button>
            <Button type="submit" className="bg-lime-400! text-ink! shadow-none!">{isNew ? 'Create role' : 'Save role'}</Button>
          </div>
        </div>
      )}
    </form>
  )
}
