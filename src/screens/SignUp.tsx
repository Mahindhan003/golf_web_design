import { useState, type FormEvent } from 'react'
import { Button, Input, PasswordInput } from '../components'
import { AuthLayout } from '../shell'
import { useApp } from '../app-context'

type Errors = Partial<Record<'fullName' | 'email' | 'phone' | 'password' | 'confirm', string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function passwordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score // 0–4
}

const STRENGTH_LABEL = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_BAR   = ['bg-rose-400', 'bg-rose-400', 'bg-amber-400', 'bg-lime-500', 'bg-lime-500']

export default function SignUp() {
  const { startSetup } = useApp()
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [errors, setErrors]     = useState<Errors>({})
  const [loading, setLoading]   = useState(false)

  function validate(): Errors {
    const e: Errors = {}
    if (fullName.trim().split(/\s+/).filter(Boolean).length < 2) e.fullName = 'Enter your first and last name'
    if (!email.trim()) e.email = 'Email is required'
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address'
    if (phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a valid phone number'
    if (password.length < 8) e.password = 'Use at least 8 characters'
    if (!confirm) e.confirm = 'Please confirm your password'
    else if (confirm !== password) e.confirm = "Passwords don't match"
    return e
  }

  const clear = (f: keyof Errors) => { if (errors[f]) setErrors(x => ({ ...x, [f]: undefined })) }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      startSetup({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() })
    }, 1000)
  }

  const strength = passwordStrength(password)

  return (
    <AuthLayout
      headline={<>Join the<br /><span className="text-lime-400">clubhouse.</span></>}
      sub="Create your account to enter tournaments, track results and manage your golfer profile."
    >
      <p className="text-[13px] font-bold font-display text-gray-500">Step 1 of 2 · Your login details</p>
      <h2 className="font-display font-extrabold text-ink text-[32px] tracking-tight mt-1">Create account</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8" noValidate>
        <Input
          label="Full name"
          placeholder="Alexander Hartwell"
          value={fullName}
          onChange={e => { setFullName(e.target.value); clear('fullName') }}
          error={errors.fullName}
          autoComplete="name"
          onCanvas
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); clear('email') }}
            error={errors.email}
            autoComplete="email"
            onCanvas
          />
          <Input
            label="Phone number"
            type="tel"
            placeholder="+1 (404) 555-0000"
            value={phone}
            onChange={e => { setPhone(e.target.value); clear('phone') }}
            error={errors.phone}
            autoComplete="tel"
            onCanvas
          />
        </div>

        <div className="flex flex-col gap-2">
          <PasswordInput
            label="Password"
            placeholder="At least 8 characters"
            value={password}
            onChange={e => { setPassword(e.target.value); clear('password') }}
            error={errors.password}
            autoComplete="new-password"
            onCanvas
          />
          {password && !errors.password && (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex gap-1">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i < strength ? STRENGTH_BAR[strength] : 'bg-black/[0.08]'}`} />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-gray-500 w-16 text-right">{STRENGTH_LABEL[strength]}</span>
            </div>
          )}
        </div>

        <PasswordInput
          label="Confirm password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={e => { setConfirm(e.target.value); clear('confirm') }}
          error={errors.confirm}
          autoComplete="new-password"
          onCanvas
        />

        <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
          {loading ? 'Creating account…' : 'Continue'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-7">
        Already have an account?{' '}
        <a href="#/signin" className="text-ink font-semibold font-display underline underline-offset-4 decoration-lime-500 decoration-2 hover:opacity-70">
          Sign in
        </a>
      </p>

      <p className="text-center text-[11px] leading-relaxed text-gray-400 mt-10">
        By creating an account, you agree to our<br />
        <span className="text-ink font-semibold">Terms of Service</span> and <span className="text-ink font-semibold">Privacy Policy</span>
      </p>
    </AuthLayout>
  )
}
