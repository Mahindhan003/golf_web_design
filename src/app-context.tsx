import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { DialogData, NewAccount, ToastData } from './types'
import { MOCK_PROFILE, applyNewAccount } from './data'
import { navigate } from './router'

export interface AccountBasics {
  fullName: string
  email: string
  phone: string
}

interface AppState {
  isAuthenticated: boolean
  basics: AccountBasics | null
  toast: ToastData | null
  dialog: DialogData | null
  /** Bumped whenever profile data changes so pages re-read MOCK_PROFILE */
  profileVersion: number
  showToast: (message: string, type?: ToastData['type']) => void
  dismissToast: () => void
  showDialog: (d: DialogData) => void
  closeDialog: () => void
  signIn: () => void
  signOut: () => void
  startSetup: (b: AccountBasics) => void
  completeSetup: (a: NewAccount) => void
  touchProfile: () => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuth]  = useState(false)
  const [basics, setBasics]         = useState<AccountBasics | null>(null)
  const [toast, setToast]           = useState<ToastData | null>(null)
  const [dialog, setDialog]         = useState<DialogData | null>(null)
  const [profileVersion, setPV]     = useState(0)

  const showToast = useCallback((message: string, type: ToastData['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])
  const showDialog   = useCallback((d: DialogData) => setDialog(d), [])
  const closeDialog  = useCallback(() => setDialog(null), [])
  const touchProfile = useCallback(() => setPV(v => v + 1), [])

  const signIn = useCallback(() => {
    setAuth(true)
    navigate('/home', { replace: true })
    showToast(`Welcome back, ${MOCK_PROFILE.firstName}`)
  }, [showToast])

  const signOut = useCallback(() => {
    setDialog({
      title: 'Sign out',
      message: 'Are you sure you want to sign out of your Golf Tournament Platform account?',
      confirmLabel: 'Sign out',
      cancelLabel: 'Stay',
      destructive: true,
      onConfirm: () => {
        setAuth(false)
        navigate('/signin', { replace: true })
        showToast('Signed out successfully', 'info')
      },
    })
  }, [showToast])

  const startSetup = useCallback((b: AccountBasics) => {
    setBasics(b)
    navigate('/setup')
  }, [])

  const completeSetup = useCallback((a: NewAccount) => {
    applyNewAccount(a)
    setBasics(null)
    setAuth(true)
    setPV(v => v + 1)
    navigate('/home', { replace: true })
    showToast(`Welcome to the clubhouse, ${MOCK_PROFILE.firstName}!`)
  }, [showToast])

  const value = useMemo<AppState>(() => ({
    isAuthenticated, basics, toast, dialog, profileVersion,
    showToast, dismissToast, showDialog, closeDialog,
    signIn, signOut, startSetup, completeSetup, touchProfile,
  }), [isAuthenticated, basics, toast, dialog, profileVersion,
       showToast, dismissToast, showDialog, closeDialog,
       signIn, signOut, startSetup, completeSetup, touchProfile])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
