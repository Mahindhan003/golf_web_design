import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { DialogData, NewAccount, ToastData } from './types'
import { MOCK_PROFILE, applyNewAccount } from './data'
import { navigate } from './router'
import { getUser, getRole, rolePermissions, useAccessVersion, type AdminUser, type Role as AdminRole } from './admin/access'

/** First admin page this set of permissions can open */
export function adminHomePath(perms: string[]) {
  if (perms.includes('dashboard.view')) return '/admin'
  if (perms.includes('tournaments.view')) return '/admin/tournaments'
  if (perms.includes('courses.view')) return '/admin/courses'
  if (perms.includes('roles.view')) return '/admin/roles'
  if (perms.includes('users.view')) return '/admin/users'
  return '/admin'
}

export interface AccountBasics {
  fullName: string
  email: string
  phone: string
}

export type Role = 'golfer' | 'admin'

interface AppState {
  isAuthenticated: boolean
  role: Role | null
  basics: AccountBasics | null
  /** Signed-in admin login and its role (admin console only) */
  adminUser: AdminUser | undefined
  adminRole: AdminRole | undefined
  /** Does the signed-in admin have this permission (e.g. "tournaments.edit")? */
  can: (perm: string) => boolean
  toast: ToastData | null
  dialog: DialogData | null
  /** Bumped whenever profile data changes so pages re-read MOCK_PROFILE */
  profileVersion: number
  showToast: (message: string, type?: ToastData['type']) => void
  dismissToast: () => void
  showDialog: (d: DialogData) => void
  closeDialog: () => void
  signIn: () => void
  signInAdmin: (userId: string) => void
  signOut: () => void
  startSetup: (b: AccountBasics) => void
  completeSetup: (a: NewAccount) => void
  touchProfile: () => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole]             = useState<Role | null>(null)
  const isAuthenticated             = role !== null
  const [basics, setBasics]         = useState<AccountBasics | null>(null)
  const [toast, setToast]           = useState<ToastData | null>(null)
  const [dialog, setDialog]         = useState<DialogData | null>(null)
  const [profileVersion, setPV]     = useState(0)
  const [adminUserId, setAdminUserId] = useState<string | null>(null)

  // Re-derive permissions whenever roles or users change (e.g. an admin edits their own role)
  const accessVersion = useAccessVersion()
  const adminUser = role === 'admin' && adminUserId ? getUser(adminUserId) : undefined
  const adminRole = adminUser ? getRole(adminUser.roleId) : undefined
  const perms = useMemo(
    () => new Set(adminUser?.active ? rolePermissions(adminUser.roleId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adminUser?.id, adminUser?.roleId, adminUser?.active, accessVersion],
  )
  const can = useCallback((perm: string) => perms.has(perm), [perms])

  const showToast = useCallback((message: string, type: ToastData['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])
  const showDialog   = useCallback((d: DialogData) => setDialog(d), [])
  const closeDialog  = useCallback(() => setDialog(null), [])
  const touchProfile = useCallback(() => setPV(v => v + 1), [])

  const signIn = useCallback(() => {
    setRole('golfer')
    navigate('/home', { replace: true })
    showToast(`Welcome back, ${MOCK_PROFILE.firstName}`)
  }, [showToast])

  const signInAdmin = useCallback((userId: string) => {
    setAdminUserId(userId)
    setRole('admin')
    const user = getUser(userId)
    navigate(adminHomePath(user ? rolePermissions(user.roleId) : []), { replace: true })
    showToast(`Welcome, ${user?.name ?? 'admin'}`)
  }, [showToast])

  const signOut = useCallback(() => {
    setDialog({
      title: 'Sign out',
      message: 'Are you sure you want to sign out of your Golf Tournament Platform account?',
      confirmLabel: 'Sign out',
      cancelLabel: 'Stay',
      destructive: true,
      onConfirm: () => {
        setRole(null)
        setAdminUserId(null)
        navigate(role === 'admin' ? '/admin/login' : '/signin', { replace: true })
        showToast('Signed out successfully', 'info')
      },
    })
  }, [showToast, role])

  const startSetup = useCallback((b: AccountBasics) => {
    setBasics(b)
    navigate('/setup')
  }, [])

  const completeSetup = useCallback((a: NewAccount) => {
    applyNewAccount(a)
    setBasics(null)
    setRole('golfer')
    setPV(v => v + 1)
    navigate('/home', { replace: true })
    showToast(`Welcome to the clubhouse, ${MOCK_PROFILE.firstName}!`)
  }, [showToast])

  const value = useMemo<AppState>(() => ({
    isAuthenticated, role, basics, adminUser, adminRole, can, toast, dialog, profileVersion,
    showToast, dismissToast, showDialog, closeDialog,
    signIn, signInAdmin, signOut, startSetup, completeSetup, touchProfile,
  }), [isAuthenticated, role, basics, adminUser, adminRole, can, toast, dialog, profileVersion,
       showToast, dismissToast, showDialog, closeDialog,
       signIn, signInAdmin, signOut, startSetup, completeSetup, touchProfile])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
