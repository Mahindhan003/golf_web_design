import { useSyncExternalStore } from 'react'

/**
 * Roles, permissions and admin logins for the admin console (prototype — no backend).
 *
 * Modelled on the chitfund admin (role → page/action permissions → one role per login),
 * but with roles as real records and a single permission catalog.
 * Everything is checked in the browser and saved to localStorage, so this demonstrates
 * the access model only; a real backend must re-check every permission server-side.
 */

/* ───────── Permission catalog (single source of truth) ───────── */

export type ActionKey =
  | 'view' | 'create' | 'edit' | 'delete'
  | 'status' | 'scorecard' | 'deactivate' | 'assign-role' | 'reset-data'

export interface ScreenDef {
  key: string
  name: string
  description: string
  actions: ActionKey[]
}

export interface ModuleDef {
  name: string
  screens: ScreenDef[]
}

export const PERMISSION_CATALOG: ModuleDef[] = [
  {
    name: 'Dashboard',
    screens: [
      { key: 'dashboard', name: 'Dashboard', description: 'Overview, statistics and quick actions', actions: ['view'] },
    ],
  },
  {
    name: 'Events',
    screens: [
      { key: 'tournaments', name: 'Tournaments', description: 'Tournament list, details and status', actions: ['view', 'create', 'edit', 'delete', 'status'] },
      { key: 'courses', name: 'Courses', description: 'Course details and scorecards', actions: ['view', 'create', 'edit', 'delete', 'scorecard'] },
    ],
  },
  {
    name: 'Administration',
    screens: [
      { key: 'roles', name: 'Roles & permissions', description: 'Create roles and choose what they can do', actions: ['view', 'create', 'edit', 'delete'] },
      { key: 'users', name: 'Admin users', description: 'Admin logins and their roles', actions: ['view', 'create', 'edit', 'deactivate', 'assign-role'] },
      { key: 'settings', name: 'Settings', description: 'Maintenance tools', actions: ['reset-data'] },
    ],
  },
]

export const STANDARD_ACTIONS: ActionKey[] = ['view', 'create', 'edit', 'delete']

export const ACTION_LABELS: Record<ActionKey, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  status: 'Change status',
  scorecard: 'Edit scorecard',
  deactivate: 'Deactivate',
  'assign-role': 'Assign role',
  'reset-data': 'Reset demo data',
}

export const permKey = (screen: string, action: ActionKey) => `${screen}.${action}`

export const ALL_PERMISSIONS: string[] = PERMISSION_CATALOG.flatMap(m =>
  m.screens.flatMap(s => s.actions.map(a => permKey(s.key, a))))

/**
 * Keeps a permission set consistent: any action on a screen that has "view"
 * implies "view", so nobody can end up with Edit but no way to open the page.
 */
export function normalizePermissions(perms: Iterable<string>): string[] {
  const set = new Set(perms)
  for (const m of PERMISSION_CATALOG) {
    for (const s of m.screens) {
      if (!s.actions.includes('view')) continue
      if (s.actions.some(a => a !== 'view' && set.has(permKey(s.key, a)))) set.add(permKey(s.key, 'view'))
    }
  }
  return ALL_PERMISSIONS.filter(p => set.has(p)) // stable catalog order, unknown keys dropped
}

/* ───────── Records ───────── */

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  /** System roles (Super Admin) always have every permission and can't be edited or deleted */
  system?: boolean
}

export interface AdminUser {
  id: string
  name: string
  email: string
  /** Prototype only — a real system stores a salted hash on the server, never in the browser */
  password: string
  roleId: string
  active: boolean
  lastSignIn?: string
  /** The built-in account can't be deactivated or moved off Super Admin */
  system?: boolean
}

export const SUPER_ADMIN_ROLE_ID = 'super-admin'

const DEFAULT_ROLES: Role[] = [
  {
    id: SUPER_ADMIN_ROLE_ID,
    name: 'Super Admin',
    description: 'Full access to everything, including roles and admin users.',
    permissions: ALL_PERMISSIONS,
    system: true,
  },
  {
    id: 'tournament-director',
    name: 'Tournament Director',
    description: 'Runs events end to end. Can view courses but not change them.',
    permissions: normalizePermissions([
      'dashboard.view',
      'tournaments.view', 'tournaments.create', 'tournaments.edit', 'tournaments.delete', 'tournaments.status',
      'courses.view',
    ]),
  },
  {
    id: 'course-manager',
    name: 'Course Manager',
    description: 'Maintains course details and scorecards. Read-only on tournaments.',
    permissions: normalizePermissions([
      'dashboard.view',
      'courses.view', 'courses.create', 'courses.edit', 'courses.delete', 'courses.scorecard',
      'tournaments.view',
    ]),
  },
  {
    id: 'registration-desk',
    name: 'Registration Desk',
    description: 'Front-desk staff. Can open and close registration on tournaments.',
    permissions: normalizePermissions(['dashboard.view', 'tournaments.view', 'tournaments.status', 'courses.view']),
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to events for reporting.',
    permissions: normalizePermissions(['dashboard.view', 'tournaments.view', 'courses.view']),
  },
]

const DEFAULT_USERS: AdminUser[] = [
  { id: 'u-admin', name: 'Administrator', email: 'admin@gmail.com', password: 'admin', roleId: SUPER_ADMIN_ROLE_ID, active: true, system: true },
  { id: 'u-director', name: 'Priya Raman', email: 'director@gmail.com', password: 'director', roleId: 'tournament-director', active: true },
  { id: 'u-courses', name: 'Marcus Lee', email: 'courses@gmail.com', password: 'courses', roleId: 'course-manager', active: true },
  { id: 'u-desk', name: 'Hannah Cole', email: 'desk@gmail.com', password: 'desk', roleId: 'registration-desk', active: true },
  { id: 'u-former', name: 'Tom Baker', email: 'tom@gmail.com', password: 'tom', roleId: 'viewer', active: false },
]

/* ───────── Store ───────── */

const STORAGE_KEY = 'gtp-access-v1'

let roles: Role[] = structuredClone(DEFAULT_ROLES)
let users: AdminUser[] = structuredClone(DEFAULT_USERS)
let version = 0
const listeners = new Set<() => void>()

;(function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as { roles?: Role[]; users?: AdminUser[] }
    if (Array.isArray(saved.roles) && saved.roles.some(r => r.id === SUPER_ADMIN_ROLE_ID)) roles = saved.roles
    if (Array.isArray(saved.users) && saved.users.some(u => u.system)) users = saved.users
  } catch {
    /* corrupt or unavailable storage — keep defaults */
  }
})()

function commit() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ roles, users })) } catch { /* session-only */ }
  version++
  listeners.forEach(l => l())
}

export function useAccessVersion() {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb) },
    () => version,
  )
}

export const getRoles = () => roles
export const getUsers = () => users
export const getRole = (id: string) => roles.find(r => r.id === id)
export const getUser = (id: string) => users.find(u => u.id === id)
export const usersWithRole = (roleId: string) => users.filter(u => u.roleId === roleId)

/** Effective permissions for a role (Super Admin always gets the full catalog) */
export function rolePermissions(roleId: string): string[] {
  const role = getRole(roleId)
  if (!role) return []
  return role.system ? ALL_PERMISSIONS : role.permissions
}

type Result = { ok: true } | { ok: false; reason: string }

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/* Roles */

export function saveRole(input: Omit<Role, 'id'> & { id?: string }): Result & { id?: string } {
  const name = input.name.trim()
  if (!name) return { ok: false, reason: 'Role name is required' }
  if (roles.some(r => r.id !== input.id && r.name.trim().toLowerCase() === name.toLowerCase())) {
    return { ok: false, reason: `A role called "${name}" already exists` }
  }
  const existing = input.id ? getRole(input.id) : undefined
  if (existing?.system) return { ok: false, reason: 'System roles can’t be changed' }

  const role: Role = {
    id: existing?.id ?? (slug(name) && !getRole(slug(name)) ? slug(name) : `role-${Date.now().toString(36)}`),
    name,
    description: input.description.trim(),
    permissions: normalizePermissions(input.permissions),
  }
  roles = existing ? roles.map(r => (r.id === role.id ? role : r)) : [...roles, role]
  commit()
  return { ok: true, id: role.id }
}

export function deleteRole(id: string): Result {
  const role = getRole(id)
  if (!role) return { ok: false, reason: 'Role not found' }
  if (role.system) return { ok: false, reason: 'System roles can’t be deleted' }
  const n = usersWithRole(id).length
  if (n) return { ok: false, reason: `${n} admin user${n > 1 ? 's have' : ' has'} this role. Give them another role first.` }
  roles = roles.filter(r => r.id !== id)
  commit()
  return { ok: true }
}

/* Users */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const activeSuperAdmins = () => users.filter(u => u.active && u.roleId === SUPER_ADMIN_ROLE_ID)

export function saveUser(input: Omit<AdminUser, 'id' | 'active' | 'lastSignIn' | 'system'> & { id?: string }): Result & { id?: string } {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (!name) return { ok: false, reason: 'Name is required' }
  if (!EMAIL_RE.test(email)) return { ok: false, reason: 'Enter a valid email address' }
  if (users.some(u => u.id !== input.id && u.email.toLowerCase() === email)) return { ok: false, reason: 'Another admin user already uses this email' }
  if (!getRole(input.roleId)) return { ok: false, reason: 'Choose a role' }

  const existing = input.id ? getUser(input.id) : undefined
  if (existing?.system && input.roleId !== SUPER_ADMIN_ROLE_ID) return { ok: false, reason: 'The built-in admin must stay a Super Admin' }
  if (existing && existing.roleId === SUPER_ADMIN_ROLE_ID && input.roleId !== SUPER_ADMIN_ROLE_ID &&
      existing.active && activeSuperAdmins().length <= 1) {
    return { ok: false, reason: 'You need at least one active Super Admin' }
  }
  if (!existing && input.password.length < 4) return { ok: false, reason: 'Password must be at least 4 characters' }

  const user: AdminUser = existing
    ? { ...existing, name, email, roleId: input.roleId, password: input.password || existing.password }
    : { id: `u-${Date.now().toString(36)}`, name, email, password: input.password, roleId: input.roleId, active: true }
  users = existing ? users.map(u => (u.id === user.id ? user : u)) : [...users, user]
  commit()
  return { ok: true, id: user.id }
}

export function setUserActive(id: string, active: boolean, currentUserId?: string): Result {
  const user = getUser(id)
  if (!user) return { ok: false, reason: 'User not found' }
  if (!active) {
    if (user.system) return { ok: false, reason: 'The built-in admin can’t be deactivated' }
    if (id === currentUserId) return { ok: false, reason: 'You can’t deactivate your own account' }
    if (user.roleId === SUPER_ADMIN_ROLE_ID && activeSuperAdmins().length <= 1) return { ok: false, reason: 'You need at least one active Super Admin' }
  }
  users = users.map(u => (u.id === id ? { ...u, active } : u))
  commit()
  return { ok: true }
}

export function resetPassword(id: string, password: string): Result {
  if (password.length < 4) return { ok: false, reason: 'Password must be at least 4 characters' }
  users = users.map(u => (u.id === id ? { ...u, password } : u))
  commit()
  return { ok: true }
}

/* Sign-in */

export function authenticate(email: string, password: string):
  { ok: true; user: AdminUser } | { ok: false; reason: 'invalid' | 'inactive' } {
  const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!user || user.password !== password) return { ok: false, reason: 'invalid' }
  if (!user.active) return { ok: false, reason: 'inactive' }
  users = users.map(u => (u.id === user.id ? { ...u, lastSignIn: new Date().toISOString() } : u))
  commit()
  return { ok: true, user }
}

export function resetAccessData() {
  roles = structuredClone(DEFAULT_ROLES)
  users = structuredClone(DEFAULT_USERS)
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  version++
  listeners.forEach(l => l())
}
