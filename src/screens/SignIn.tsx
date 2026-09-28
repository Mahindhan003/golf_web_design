import { useState, type FormEvent } from 'react'
import { Button, Input, PasswordInput } from '../components'
import { AuthLayout } from '../shell'
import { useApp } from '../app-context'
import { authenticate, authFailureMessage } from '../admin/access'

type SignInState = 'idle' | 'loading' | 'error' | 'server-error' | 'account'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignIn() {
  const { signIn, signInAdmin, showToast } = useApp()
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [emailError, setEmailError] = useState('')
  const [pwError, setPwError]       = useState('')
  const [state, setState]           = useState<SignInState>('idle')
  const [accountMsg, setAccountMsg] = useState('')

  const validateEmail = (v: string) => (!v ? 'Email is required' : !EMAIL_RE.test(v) ? 'Enter a valid email address' : '')
  const validatePw    = (v: string) => (!v ? 'Password is required' : v.length < 4 ? 'Password must be at least 4 characters' : '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const ev = validateEmail(email)
    const pv = validatePw(password)
    setEmailError(ev)
    setPwError(pv)
    if (ev || pv) return

    setState('loading')
    // Simulated API call — "wrongpass" / "serverdown" demo the error states
    setTimeout(() => {
      if (password === 'serverdown') return setState('server-error')
      if (password === 'wrongpass') return setState('error')
      setState('idle')
      // Admin console and organiser logins can also sign in here
      const admin = authenticate(email, password)
      if (admin.ok) return signInAdmin(admin.user.id)
      if (admin.reason !== 'invalid') {
        // A real admin/organiser account that can't get in — explain why instead of treating them as a golfer
        setAccountMsg(authFailureMessage(admin))
        return setState('account')
      }
      signIn()
    }, 1400)
  }

  return (
    <AuthLayout
      headline={<>Play the<br /><span className="text-lime-400">tournaments</span><br />you love.</>}
      sub="Find events near you, register in seconds and track every round in one place."
    >
      <h2 className="font-display font-extrabold text-ink text-[32px] tracking-tight">Welcome back</h2>
      <p className="text-gray-500 text-[15px] mt-1">Sign in to your account to continue</p>

      {state === 'account' && (
        <div className="mt-6 flex items-start gap-3 bg-amber-50 rounded-2xl px-4 py-3.5 fade-in" role="alert">
          <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800 font-display">{accountMsg}</p>
        </div>
      )}
      {(state === 'error' || state === 'server-error') && (
        <div className="mt-6 flex items-start gap-3 bg-rose-50 rounded-2xl px-4 py-3.5 fade-in" role="alert">
          <svg width="18" height="18" viewBox="0 0 18 18" className="flex-shrink-0 mt-0.5" fill="none">
            <circle cx="9" cy="9" r="8" stroke="#dc2626" strokeWidth="1.3" fill="#fef2f2"/>
            <path d="M9 5.5v4M9 11v1" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-rose-700 font-display">
              {state === 'error' ? 'Invalid credentials' : 'Server error'}
            </p>
            <p className="text-xs text-rose-500 mt-0.5">
              {state === 'error' ? 'The email or password you entered is incorrect.' : 'Unable to connect. Please try again shortly.'}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8" noValidate>
        <Input
          label="Email address"
          type="email"
          placeholder="alex@golfclub.com"
          value={email}
          onChange={e => { setEmail(e.target.value); if (emailError) setEmailError('') }}
          onBlur={() => setEmailError(validateEmail(email))}
          error={emailError}
          autoComplete="email"
          onCanvas
        />
        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={e => { setPassword(e.target.value); if (pwError) setPwError('') }}
          onBlur={() => setPwError(validatePw(password))}
          error={pwError}
          autoComplete="current-password"
          onCanvas
        />

        <div className="flex justify-end -mt-1">
          <button
            type="button"
            onClick={() => showToast('Password reset email sent', 'info')}
            className="text-ink text-[13px] font-semibold font-display underline underline-offset-4 decoration-lime-500 decoration-2 hover:opacity-70"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" fullWidth size="lg" loading={state === 'loading'} className="mt-2">
          {state === 'loading' ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-7">
        Don't have an account?{' '}
        <a href="#/signup" className="text-ink font-semibold font-display underline underline-offset-4 decoration-lime-500 decoration-2 hover:opacity-70">
          Sign up
        </a>
      </p>

      <p className="text-center text-[13px] text-gray-500 mt-3">
        Organiser?{' '}
        <a href="#/admin/login" className="text-ink font-semibold font-display hover:underline underline-offset-4">Admin sign in</a>
      </p>

      <p className="text-center text-[11px] leading-relaxed text-gray-400 mt-10">
        By signing in, you agree to our<br />
        <span className="text-ink font-semibold">Terms of Service</span> and <span className="text-ink font-semibold">Privacy Policy</span>
      </p>
    </AuthLayout>
  )
}
