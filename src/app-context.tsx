import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { DialogData, NewAccount, ToastData } from './types'
import { MOCK_PROFILE, applyNewAccount } from './data'
import { navigate } from './router'
import {
  getUser, getRole, getOrganization, userPermissions, useAccessVersion,
  type AdminUser, type Role as AdminRole, type Organization,
} from './admin/access'
import { assignmentsFor, type Actor } from './ops'

/** First admin page this set of permissions can open */
export function adminHomePath(perms: string[]) {
  if (perms.includes('dashboard.view')) return '/admin'
  if (perms.includes('tournaments.view')) return '/admin/tournaments'
  if (perms.includes('courses.view')) return '/admin/courses'
  if (perms.includes('organisation.view')) return '/admin/organisation'
  if (perms.includes('organizers.view')) return '/admin/organizers'
  if (perms.includes('roles.view')) return '/admin/roles'
  if (perms.includes('users.view')) return '/admin/users'
  return '/admin'
}

export type AccountType = 'golfer' | 'organizer'

export interface AccountBasics {
  fullName: string
  email: string
  phone: string
  /** Needed for organiser logins (golfer accounts are mock-only) */
  password?: string
  accountType?: AccountType
  firstName?: string
  lastName?: string
  /** Organisers: their role in the organisation */
  jobTitle?: string
  /** Separate, unticked opt-in for product news (CASL) */
  marketingOptIn?: boolean
}

/** golfer · admin (platform staff and organisers share the console) · staff (marshals and tournament officials, per tournament) */
export type Role = 'golfer' | 'admin' | 'staff'

interface AppState {
  isAuthenticated: boolean
  role: Role | null
  basics: AccountBasics | null
  /** Signed-in admin login and its role (admin console only) */
  adminUser: AdminUser | undefined
  adminRole: AdminRole | undefined
  /** The signed-in admin's organisation (undefined for platform staff) */
  adminOrg: Organization | undefined
  /** Marshal / official login: their email decides which tournaments they can open */
  staffEmail: string | null
  staffName: string
  /** The signed-in console user as recorded on incidents and score changes */
  consoleActor: Actor | undefined
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
  signInStaff: (email: string, name: string) => void
  /** One account, several roles: the golfer opens their marshal duty, and back */
  switchRole: (to: 'golfer' | 'staff', tournamentId?: string) => void
  signOut: () => void
  startSetup: (b: AccountBasics) => void
  completeSetup: (a: NewAccount) => void
  completeOrganizerSetup: (userId: string) => void
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
  const [staffEmail, setStaffEmail] = useState<string | null>(null)
  const [staffName, setStaffName]   = useState('')

  // Re-derive permissions whenever roles or users change (e.g. an admin edits their own role)
  const accessVersion = useAccessVersion()
  const adminUser = role === 'admin' && adminUserId ? getUser(adminUserId) : undefined
  const adminRole = adminUser ? getRole(adminUser.roleId) : undefined
  const adminOrg = getOrganization(adminUser?.organizationId)
  const perms = useMemo(
    () => new Set(userPermissions(adminUser)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adminUser?.id, adminUser?.roleId, adminUser?.active, adminOrg?.status, accessVersion],
  )
  const can = useCallback((perm: string) => perms.has(perm), [perms])
  const consoleActor = useMemo<Actor | undefined>(
    () => (adminUser ? { name: adminUser.name, role: adminOrg ? 'organiser' : 'admin' } : undefined),
    [adminUser?.name, adminOrg?.id], // eslint-disable-line react-hooks/exhaustive-deps
  )

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
    navigate(adminHomePath(userPermissions(user)), { replace: true })
    showToast(`Welcome, ${user?.name ?? 'admin'}`)
  }, [showToast])

  const signInStaff = useCallback((email: string, name: string) => {
    setStaffEmail(email)
    setStaffName(name)
    setRole('staff')
    // Straight into the tournament that's on today, if there's exactly one
    const live = assignmentsFor(email).filter(a => a.window === 'live')
    navigate(live.length === 1 ? `/staff/${live[0].tournament.id}` : '/staff', { replace: true })
    showToast(`Welcome, ${name}`)
  }, [showToast])

  const switchRole = useCallback((to: 'golfer' | 'staff', tournamentId?: string) => {
    if (to === 'staff') {
      setStaffEmail(MOCK_PROFILE.email)
      setStaffName(`${MOCK_PROFILE.firstName} ${MOCK_PROFILE.lastName}`)
      setRole('staff')
      navigate(tournamentId ? `/staff/${tournamentId}` : '/staff')
    } else {
      setRole('golfer')
      setStaffEmail(null)
      navigate('/home')
    }
  }, [])

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
        setStaffEmail(null)
        navigate('/signin', { replace: true })
        showToast('Signed out successfully', 'info')
      },
    })
  }, [showToast])

  const startSetup = useCallback((b: AccountBasics) => {
    setBasics(b)
    navigate(b.accountType === 'organizer' ? '/organizer-setup' : '/setup')
  }, [])

  /** Organiser sign-up finished: their pending organisation exists, sign them into the console */
  const completeOrganizerSetup = useCallback((userId: string) => {
    setBasics(null)
    setAdminUserId(userId)
    setRole('admin')
    navigate('/admin', { replace: true })
    showToast('Application submitted — check your inbox to verify your email')
  }, [showToast])

  const completeSetup = useCallback((a: NewAccount) => {
    applyNewAccount(a)
    setBasics(null)
    setRole('golfer')
    setPV(v => v + 1)
    navigate('/home', { replace: true })
    showToast(`Welcome, ${MOCK_PROFILE.firstName}! We've emailed a confirmation to ${MOCK_PROFILE.email}`)
  }, [showToast])

  const value = useMemo<AppState>(() => ({
    isAuthenticated, role, basics, adminUser, adminRole, adminOrg, staffEmail, staffName, consoleActor, can, toast, dialog, profileVersion,
    showToast, dismissToast, showDialog, closeDialog,
    signIn, signInAdmin, signInStaff, switchRole, signOut, startSetup, completeSetup, completeOrganizerSetup, touchProfile,
  }), [isAuthenticated, role, basics, adminUser, adminRole, adminOrg, staffEmail, staffName, consoleActor, can, toast, dialog, profileVersion,
       showToast, dismissToast, showDialog, closeDialog,
       signIn, signInAdmin, signInStaff, switchRole, signOut, startSetup, completeSetup, completeOrganizerSetup, touchProfile])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
