import { useState, type FormEvent } from 'react'
import { PageHeader } from '../shell'
import { Button, Input, SelectField } from '../components'
import { useApp } from '../app-context'
import { navigate } from '../router'
import { BackLink } from '../screens/TournamentDetails'
import { IconPlus, IconPencil, IconTrash, NoAccess, Can } from './AdminShell'
import {
  PERMISSION_CATALOG, STANDARD_ACTIONS, ACTION_LABELS, PLATFORM_ELIGIBLE, ORG_ELIGIBLE, permKey,
  getRole, usersWithRole, rolePermissions, saveRole, deleteRole, useAccessVersion,
  visibleRoles, canEditRole, grantablePermissions, SUPER_ADMIN_ROLE_ID, ORGANIZER_ROLE_ID,
  type ActionKey, type Role, type RoleScope, type ScreenDef, type AdminUser,
} from './access'

/* Duplicate → editor hand-off (keeps the hash URL clean) */
let pendingCopyFrom: string | null = null

const eligibleFor = (scope: RoleScope) => (scope === 'organization' ? ORG_ELIGIBLE : PLATFORM_ELIGIBLE)
const roleScopeOf = (role: Role | undefined, actor: AdminUser | undefined): RoleScope =>
  role?.scope ?? (actor?.organizationId ? 'organization' : 'platform')

/** Users with this role that the viewer is allowed to see */
const roleUsers = (role: Role, actor?: AdminUser) => usersWithRole(role.id, actor?.organizationId)

function useConfirmDeleteRole() {
  const { showDialog, showToast, adminUser } = useApp()
  return (role: Role, after?: () => void) => {
    const n = usersWithRole(role.id).length
    if (n) {
      showDialog({
        title: "Can't delete this role",
        message: `${n} admin user${n > 1 ? 's have' : ' has'} the ${role.name} role. Give them another role first.`,
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
        const r = deleteRole(adminUser, role.id)
        if (r.ok) { showToast('Role deleted', 'info'); after?.() }
        else showToast(r.reason, 'error')
      },
    })
  }
}

/** Short per-screen summary, e.g. "Tournaments · Full" */
function accessSummary(perms: string[], eligible: string[]) {
  const set = new Set(perms)
  return PERMISSION_CATALOG.flatMap(m => m.screens)
    .filter(s => s.actions.some(a => eligible.includes(permKey(s.key, a))))
    .map(s => {
      const have = s.actions.filter(a => set.has(permKey(s.key, a)))
      const level = have.length === 0 ? 'none' : have.length === s.actions.length ? 'full' : have.length === 1 && have[0] === 'view' ? 'view' : 'partial'
      return { screen: s, level }
    })
    .filter(x => x.level !== 'none')
}

const LEVEL_STYLE: Record<string, string> = { full: 'bg-lime-400 text-ink', partial: 'bg-ink text-white', view: 'bg-canvas text-gray-600' }
const LEVEL_LABEL: Record<string, string> = { full: 'Full', partial: 'Partial', view: 'View only' }

/* ───────── Role card ───────── */

function RoleCard({ role }: { role: Role }) {
  const { can, adminUser } = useApp()
  const confirmDelete = useConfirmDeleteRole()
  const perms = rolePermissions(role.id)
  const eligible = role.id === SUPER_ADMIN_ROLE_ID ? PLATFORM_ELIGIBLE : eligibleFor(role.scope)
  const shown = perms.filter(p => eligible.includes(p))
  const users = roleUsers(role, adminUser)
  const pct = Math.round((shown.length / eligible.length) * 100)
  const summary = accessSummary(perms, eligible)
  const dark = role.system
  const editable = canEditRole(adminUser, role)
  const isOrganizer = role.id === ORGANIZER_ROLE_ID

  return (
    <article className={`rounded-[28px] p-6 flex flex-col ${dark ? 'bg-ink text-white shadow-float relative overflow-hidden' : 'bg-white shadow-card'}`}>
      {dark && (
        <div className="absolute inset-y-0 right-0 w-[70%] pointer-events-none"
          style={{ background: 'linear-gradient(90deg, rgba(200,236,90,0) 0%, rgba(200,236,90,0.10) 40%, rgba(200,236,90,0.22) 100%)' }} />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <h2 className={`font-display font-bold text-[19px] tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>{role.name}</h2>
        {dark && (
          <span className="flex-shrink-0 inline-flex items-center h-6 px-2.5 rounded-full bg-lime-400 text-ink text-[11px] font-bold font-display">
            {isOrganizer ? (adminUser?.organizationId ? 'Your ceiling' : 'Built-in · ceiling') : 'Built-in'}
          </span>
        )}
      </div>
      <p className={`relative text-[13px] mt-1 leading-relaxed min-h-[40px] ${dark ? 'text-white/60' : 'text-gray-500'}`}>
        {role.description || 'No description'}
      </p>

      <div className="relative mt-4">
        <div className={`flex justify-between text-[12px] font-semibold mb-1.5 ${dark ? 'text-white/60' : 'text-gray-500'}`}>
          <span>{shown.length} of {eligible.length} permissions</span><span>{pct}%</span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-white/10' : 'bg-canvas'}`}>
          <div className="h-full rounded-full bg-lime-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {role.id !== SUPER_ADMIN_ROLE_ID && (
        <div className="relative flex flex-wrap gap-1.5 mt-4">
          {summary.length === 0
            ? <span className={`text-[12px] ${dark ? 'text-white/50' : 'text-gray-400'}`}>No access yet</span>
            : summary.map(({ screen, level }) => (
              <span key={screen.key} className={`h-6 px-2.5 rounded-full text-[11px] font-semibold font-display inline-flex items-center ${dark ? (level === 'full' ? 'bg-lime-400 text-ink' : 'bg-white/10 text-white/80') : LEVEL_STYLE[level]}`}>
                {screen.name} · {LEVEL_LABEL[level]}
              </span>
            ))}
        </div>
      )}

      <div className="relative flex items-center gap-2 mt-auto pt-5">
        <div className="flex -space-x-2 mr-auto">
          {users.slice(0, 4).map(u => (
            <span key={u.id} title={u.name}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold font-display ring-2 ${dark ? 'ring-ink' : 'ring-white'} ${u.active ? 'bg-lime-300 text-ink' : 'bg-gray-200 text-gray-500'}`}>
              {u.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('')}
            </span>
          ))}
          {users.length === 0 && <span className={`text-[12px] ${dark ? 'text-white/50' : 'text-gray-400'}`}>No users</span>}
          {users.length > 4 && <span className="w-8 h-8 rounded-full bg-canvas text-gray-600 text-[11px] font-bold flex items-center justify-center ring-2 ring-white">+{users.length - 4}</span>}
        </div>

        <a href={`#/admin/roles/${role.id}`} aria-label={`${editable ? 'Edit' : 'View'} ${role.name}`}
          className={`h-9 px-3.5 rounded-full text-[13px] font-bold font-display inline-flex items-center gap-1.5 ${dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-canvas text-ink hover:bg-gray-200'}`}>
          {editable ? <><IconPencil /> Edit</> : 'View'}
        </a>
        {role.id !== SUPER_ADMIN_ROLE_ID && can('roles.create') && (
          <button onClick={() => { pendingCopyFrom = role.id; navigate('/admin/roles/new') }} aria-label={`Duplicate ${role.name}`} title="Duplicate"
            className={`w-9 h-9 rounded-full flex items-center justify-center ${dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-canvas text-ink hover:bg-gray-200'}`}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="6" y="6" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M12 6V4.5A1.5 1.5 0 0010.5 3h-6A1.5 1.5 0 003 4.5v6A1.5 1.5 0 004.5 12H6" stroke="currentColor" strokeWidth="1.6"/></svg>
          </button>
        )}
        {!role.system && editable && can('roles.delete') && (
          <button onClick={() => confirmDelete(role)} aria-label={`Delete ${role.name}`} title="Delete"
            className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100"><IconTrash /></button>
        )}
      </div>
    </article>
  )
}

/* ───────── List ───────── */

export function AdminRoles() {
  useAccessVersion()
  const { can, adminUser, adminOrg } = useApp()
  if (!can('roles.view')) return <NoAccess what="view roles" />

  const roles = visibleRoles(adminUser)
  const builtIn = roles.filter(r => r.system)
  const custom = roles.filter(r => !r.system)
  const isOrg = !!adminUser?.organizationId

  return (
    <div className="page-in">
      <PageHeader
        eyebrow={isOrg ? adminOrg?.name : 'Administration'}
        title="Roles & permissions"
        actions={<Can perm="roles.create"><Button onClick={() => { pendingCopyFrom = null; navigate('/admin/roles/new') }}><IconPlus /> New role</Button></Can>}
      />
      <p className="text-gray-500 -mt-4 mb-8 max-w-2xl">
        {isOrg
          ? 'Create roles for your team. A role can include any permission you have yourself — never more than the Organizer role allows.'
          : 'Super Admin runs the platform. Organizer is given to every organisation owner and caps what organisations can do. Create extra platform roles for your own staff.'}
      </p>

      <h2 className="font-display font-bold text-ink text-[17px] tracking-tight mb-3">Built-in roles</h2>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mb-10">
        {builtIn.map(r => <RoleCard key={r.id} role={r} />)}
      </div>

      <h2 className="font-display font-bold text-ink text-[17px] tracking-tight mb-3">{isOrg ? 'Your team roles' : 'Platform roles'}</h2>
      {custom.length === 0 ? (
        <div className="bg-white rounded-[28px] shadow-card p-8 text-center">
          <p className="font-display font-bold text-ink">No custom roles yet</p>
          <p className="text-sm text-gray-500 mt-1">{isOrg ? 'Create a role such as “Event Staff” to give your team limited access.' : 'Create roles for platform staff.'}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {custom.map(r => <RoleCard key={r.id} role={r} />)}
        </div>
      )}
    </div>
  )
}

/* ───────── Permission grid pieces ───────── */

function IconLockSmall() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="2"/><path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}

function Check({ on, onToggle, disabled, locked, label }: { on: boolean; onToggle: () => void; disabled?: boolean; locked?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      aria-disabled={disabled || locked}
      disabled={disabled || locked}
      title={locked ? 'You don’t have this permission, so you can’t grant it' : undefined}
      onClick={onToggle}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
        on ? 'bg-ink' : locked ? 'bg-canvas text-gray-300' : 'bg-white border-2 border-black/15'
      } ${disabled || locked ? 'cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${disabled && !locked ? 'opacity-60' : ''}`}
    >
      {on
        ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="#c8ec5a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : locked ? <IconLockSmall /> : null}
    </button>
  )
}

function Switch({ on, onToggle, disabled, label }: { on: boolean; onToggle: () => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-lime-500' : 'bg-black/15'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
  const visible = !existing || visibleRoles(adminUser).some(r => r.id === existing.id)

  const scope = roleScopeOf(existing, adminUser)
  const grantable = new Set(grantablePermissions(adminUser, existing?.id, scope))
  const eligible = existing?.id === SUPER_ADMIN_ROLE_ID ? PLATFORM_ELIGIBLE : eligibleFor(scope)

  const [copyFrom] = useState(() => { const c = pendingCopyFrom; pendingCopyFrom = null; return c })
  const source = existing ?? (copyFrom ? getRole(copyFrom) : undefined)

  const [name, setName]        = useState(existing?.name ?? (source ? `${source.name} (copy)` : ''))
  const [description, setDesc] = useState(existing?.description ?? source?.description ?? '')
  const [perms, setPerms]      = useState<Set<string>>(() => {
    const initial = source ? rolePermissions(source.id) : ['dashboard.view']
    // A copy can only keep what the current admin is allowed to grant
    return new Set(existing ? initial : initial.filter(p => grantable.has(p)))
  })
  const [error, setError]      = useState('')

  if ((id && !existing) || !visible) {
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
  const readOnly = existing ? !canEditRole(adminUser, existing) : false
  const done = () => navigate('/admin/roles')
  const assigned = existing ? roleUsers(existing, adminUser) : []
  const editingOwnRole = !!existing && adminUser?.roleId === existing.id
  const isOrganizerRole = existing?.id === ORGANIZER_ROLE_ID
  const isOrgActor = !!adminUser?.organizationId

  const has = (k: string) => perms.has(k)
  const canToggle = (k: string) => !readOnly && grantable.has(k)
  const update = (fn: (next: Set<string>) => void) => { if (readOnly) return; const next = new Set(perms); fn(next); setPerms(next) }

  function toggle(screen: ScreenDef, action: ActionKey) {
    const k = permKey(screen.key, action)
    if (!canToggle(k)) return
    update(next => {
      if (next.has(k)) {
        next.delete(k)
        if (action === 'view') screen.actions.forEach(a => next.delete(permKey(screen.key, a)))
      } else {
        next.add(k)
        const view = permKey(screen.key, 'view')
        if (action !== 'view' && screen.actions.includes('view') && grantable.has(view)) next.add(view)
      }
    })
  }

  /** Switch everything the admin is allowed to grant within these screens on or off */
  function setAll(screens: ScreenDef[], on: boolean) {
    update(next => screens.forEach(s => s.actions.forEach(a => {
      const k = permKey(s.key, a)
      if (!grantable.has(k)) return
      if (on) next.add(k); else next.delete(k)
    })))
  }

  function copyPermissionsFrom(roleId: string) {
    if (!roleId) return
    const copied = rolePermissions(roleId).filter(p => grantable.has(p) && eligible.includes(p))
    setPerms(new Set(copied))
    showToast(`Copied permissions from ${getRole(roleId)?.name}`, 'info')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    if (!name.trim()) { setError('Role name is required'); return }
    const r = saveRole(adminUser, { id: existing?.id, name, description, permissions: [...perms].filter(p => eligible.includes(p)) })
    if (!r.ok) { setError(r.reason); return }
    showToast(isNew ? `"${name.trim()}" created` : 'Role saved')
    done()
  }

  const total = [...perms].filter(p => eligible.includes(p)).length
  const lockedCount = eligible.filter(p => !grantable.has(p)).length

  // Only show screens that can exist in this kind of role
  const modules = PERMISSION_CATALOG
    .map(m => ({ ...m, screens: m.screens.filter(s => s.actions.some(a => eligible.includes(permKey(s.key, a)))) }))
    .filter(m => m.screens.length)

  return (
    <form onSubmit={submit} noValidate className="page-in">
      <BackLink label="Roles & permissions" onClick={done} />
      <PageHeader
        eyebrow={isNew ? (isOrgActor ? 'Create team role' : 'Create platform role') : readOnly ? 'View role' : 'Edit role'}
        title={isNew ? (name.trim() || 'New role') : existing!.name}
        actions={!isNew && !existing!.system && !readOnly && can('roles.delete') && (
          <button type="button" onClick={() => confirmDelete(existing!, done)}
            className="h-11 px-4 rounded-full bg-rose-50 text-rose-600 text-[14px] font-bold font-display flex items-center gap-2 hover:bg-rose-100">
            <IconTrash /> Delete
          </button>
        )}
      />

      {existing?.id === SUPER_ADMIN_ROLE_ID && (
        <div className="mb-6 flex items-center gap-3 bg-ink text-white rounded-2xl px-5 py-4">
          <span className="w-2 h-2 rounded-full bg-lime-400 flex-shrink-0" />
          <p className="text-[14px]">Super Admin is a built-in role. It always has every permission and can't be edited or deleted.</p>
        </div>
      )}
      {isOrganizerRole && (
        <div className="mb-6 flex items-start gap-3 bg-ink text-white rounded-2xl px-5 py-4">
          <span className="w-2 h-2 rounded-full bg-lime-400 flex-shrink-0 mt-2" />
          <p className="text-[14px] leading-relaxed">
            {readOnly
              ? 'Organizer is the built-in role for organisation owners. It’s the most your organisation can do — only the platform team can change it.'
              : 'Organizer is given to every organisation owner and is the ceiling for all organisations. Team roles they create can never exceed it. Changes apply to every organisation immediately.'}
          </p>
        </div>
      )}
      {!readOnly && lockedCount > 0 && !isOrganizerRole && (
        <div className="mb-6 flex items-start gap-3 bg-white shadow-card rounded-2xl px-5 py-4">
          <span className="text-gray-400 mt-0.5"><IconLockSmall /></span>
          <p className="text-[14px] text-gray-600 leading-relaxed">
            You can only give permissions your own role has. {lockedCount} permission{lockedCount === 1 ? ' is' : 's are'} locked because {isOrgActor ? 'your role (or the Organizer ceiling) doesn’t include them' : 'your role doesn’t include them'}.
          </p>
        </div>
      )}
      {editingOwnRole && !readOnly && (
        <div className="mb-6 bg-amber-50 text-amber-800 rounded-2xl px-5 py-4 text-[14px]">
          This is your own role. Removing permissions here will also limit what you can do after saving.
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="space-y-5">
          <section className="bg-white rounded-[28px] shadow-card p-6">
            <h2 className="font-display font-bold text-ink text-[18px] tracking-tight mb-4">Role details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Role name" placeholder="e.g. Event Staff" value={name} disabled={readOnly || !!existing?.system}
                onChange={e => { setName(e.target.value); setError('') }} error={error} />
              <Input label="Description" placeholder="What is this role for?" value={description} disabled={readOnly}
                onChange={e => setDesc(e.target.value)} />
            </div>
          </section>

          {modules.map(mod => {
            const keys = mod.screens.flatMap(s => s.actions.map(a => permKey(s.key, a))).filter(k => eligible.includes(k))
            const on = keys.filter(has).length
            const grantableKeys = keys.filter(k => grantable.has(k))
            const allOn = grantableKeys.length > 0 && grantableKeys.every(has)
            return (
              <section key={mod.name} className="bg-white rounded-[28px] shadow-card overflow-hidden">
                <header className="flex items-center justify-between gap-4 px-6 pt-5 pb-4">
                  <div>
                    <h2 className="font-display font-bold text-ink text-[18px] tracking-tight">{mod.name}</h2>
                    <p className="text-[12px] font-semibold text-gray-500 mt-0.5">{on} of {keys.length} permissions</p>
                  </div>
                  <label className="flex items-center gap-2.5 text-[13px] font-semibold font-display text-gray-600">
                    Select all
                    <Switch on={allOn} disabled={readOnly || grantableKeys.length === 0} label={`Select all ${mod.name} permissions`} onToggle={() => setAll(mod.screens, !allOn)} />
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
                        const screenGrantable = screenKeys.filter(k => grantable.has(k))
                        const screenAll = screenGrantable.length > 0 && screenGrantable.every(has)
                        const extras = screen.actions.filter(a => !STANDARD_ACTIONS.includes(a))
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
                                    const locked = !readOnly && !grantable.has(k)
                                    return (
                                      <button key={a} type="button" role="checkbox" aria-checked={active} aria-label={`${screen.name}: ${ACTION_LABELS[a]}`}
                                        disabled={readOnly || locked} onClick={() => toggle(screen, a)}
                                        title={locked ? 'You don’t have this permission, so you can’t grant it' : undefined}
                                        className={`h-8 pl-2 pr-3 rounded-full inline-flex items-center gap-1.5 text-[12px] font-semibold font-display transition-colors ${
                                          active ? 'bg-ink text-white' : locked ? 'bg-canvas text-gray-300' : 'bg-canvas text-gray-600 hover:bg-gray-200'
                                        } ${readOnly || locked ? 'cursor-not-allowed' : ''}`}>
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center ${active ? 'bg-lime-400' : locked ? '' : 'border-2 border-black/20'}`}>
                                          {active
                                            ? <svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="#0c1a12" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                            : locked ? <IconLockSmall /> : null}
                                        </span>
                                        {ACTION_LABELS[a]}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </td>
                            {STANDARD_ACTIONS.map(a => {
                              const k = permKey(screen.key, a)
                              return (
                                <td key={a} className="py-4 px-2">
                                  <div className="flex justify-center">
                                    {screen.actions.includes(a)
                                      ? <Check on={has(k)} disabled={readOnly} locked={!readOnly && !grantable.has(k)} label={`${screen.name}: ${ACTION_LABELS[a]}`} onToggle={() => toggle(screen, a)} />
                                      : <span className="text-gray-300 text-[13px] h-7 flex items-center">—</span>}
                                  </div>
                                </td>
                              )
                            })}
                            <td className="py-4 pl-2 pr-6">
                              <div className="flex justify-center">
                                <Switch on={screenAll} disabled={readOnly || screenGrantable.length === 0} label={`All ${screen.name} permissions`} onToggle={() => setAll([screen], !screenAll)} />
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
              {total}<span className="text-white/40 text-[20px]"> / {eligible.length}</span>
            </p>
            <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-lime-400 rounded-full transition-all" style={{ width: `${(total / eligible.length) * 100}%` }} />
            </div>
            <p className="relative text-[12px] text-white/50 mt-3">
              {scope === 'organization' ? 'Organisation role — applies only inside your organisation. ' : 'Platform role. '}
              Choosing Create, Edit or Delete also grants View.
            </p>
          </section>

          {!readOnly && !isOrganizerRole && (
            <section className="bg-white rounded-[28px] shadow-card p-6">
              <SelectField
                label="Copy permissions from"
                placeholder="Choose a role…"
                value=""
                onChange={copyPermissionsFrom}
                options={visibleRoles(adminUser).filter(r => r.id !== existing?.id).map(r => ({ value: r.id, label: r.name }))}
              />
              <p className="text-[12px] text-gray-500 mt-2">Copies only permissions you're allowed to grant. Nothing is saved until you click Save.</p>
            </section>
          )}

          {!isNew && (
            <section className="bg-white rounded-[28px] shadow-card p-6">
              <h3 className="font-display font-bold text-ink text-[16px] tracking-tight">Users with this role</h3>
              {assigned.length === 0 ? (
                <p className="text-[13px] text-gray-500 mt-2">No admin users have this role yet.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {assigned.slice(0, 8).map(u => (
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
                  {assigned.length > 8 && <li className="text-[12px] text-gray-500">+{assigned.length - 8} more</li>}
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
