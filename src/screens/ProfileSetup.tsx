import { useState, type ReactNode } from 'react'
import { Button, Input, SelectField, ChoiceChips, fieldClass } from '../components'
import { Wordmark } from '../shell'
import { useApp } from '../app-context'
import { navigate } from '../router'

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

const HANDICAP_BODIES = [
  'USGA (GHIN)', 'England Golf', 'Golf Australia', 'Golf Canada',
  'Golf Ireland', 'Scottish Golf', 'Wales Golf', 'Other', 'No handicap yet',
]

const TEES = [
  { value: 'Black', swatch: '#111827' },
  { value: 'Blue',  swatch: '#2563eb' },
  { value: 'White', swatch: '#ffffff' },
  { value: 'Gold',  swatch: '#c9a227' },
  { value: 'Red',   swatch: '#dc2626' },
  { value: 'Green', swatch: '#16a34a' },
]

const DIETARY = ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut allergy', 'Halal', 'Kosher']
const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

const STEPS = [
  { title: 'About you',     subtitle: 'Personal details and who to contact in an emergency' },
  { title: 'Your game',     subtitle: 'Handicap and where you usually play' },
  { title: 'Event details', subtitle: 'Helps organisers with catering and player packs' },
]

type Errors = Partial<Record<string, string>>

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-3xl shadow-card p-6">
      <h3 className="text-[17px] text-ink font-bold font-display tracking-tight mb-4">{title}</h3>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

export default function ProfileSetup() {
  const { basics, completeSetup } = useApp()
  const [step, setStep]     = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)

  const [dob, setDob]             = useState('')
  const [gender, setGender]       = useState('')
  const [ecName, setEcName]       = useState('')
  const [ecPhone, setEcPhone]     = useState('')
  const [handicap, setHandicap]   = useState('')
  const [body, setBody]           = useState('')
  const [memberNo, setMemberNo]   = useState('')
  const [homeClub, setHomeClub]   = useState('')
  const [tee, setTee]             = useState('')
  const [dietary, setDietary]     = useState<string[]>([])
  const [dietNotes, setDietNotes] = useState('')
  const [shirt, setShirt]         = useState('')
  const [membership, setMembership] = useState<'' | 'Member' | 'Guest'>('')

  // Setup only makes sense after step 1 of sign-up
  if (!basics) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-display font-extrabold text-ink text-[28px] tracking-tight">Start by creating your account</h1>
        <p className="text-gray-500">Your golfer profile is set up right after sign-up.</p>
        <Button onClick={() => navigate('/signup', { replace: true })}>Go to sign up</Button>
      </div>
    )
  }

  const noHandicap = body === 'No handicap yet'

  function validate(s: number): Errors {
    const e: Errors = {}
    if (s === 0) {
      if (!dob) e.dob = 'Date of birth is required'
      else if (new Date(dob) > new Date()) e.dob = "Date of birth can't be in the future"
      if (!gender) e.gender = 'Please choose an option'
      if (!ecName.trim()) e.ecName = 'Contact name is required'
      if (ecPhone.replace(/\D/g, '').length < 7) e.ecPhone = 'Enter a valid phone number'
    }
    if (s === 1) {
      if (!body) e.body = 'Choose your issuing body'
      if (!noHandicap) {
        const hi = parseFloat(handicap)
        if (handicap.trim() === '' || isNaN(hi) || hi < -10 || hi > 54) e.handicap = 'Enter a value between −10 and 54'
      }
      if (!tee) e.tee = 'Choose your preferred tee'
    }
    if (s === 2) {
      if (dietary.length === 0) e.dietary = 'Choose at least one option (or None)'
      if (!shirt) e.shirt = 'Choose your shirt size'
      if (!membership) e.membership = 'Let us know if you are a member or guest'
    }
    return e
  }

  const clear = (f: string) => { if (errors[f]) setErrors(x => ({ ...x, [f]: undefined })) }

  function next() {
    const errs = validate(step)
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    if (step < STEPS.length - 1) { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); return }

    setSaving(true)
    setTimeout(() => {
      completeSetup({
        ...basics!,
        dob, gender,
        emergencyContactName: ecName,
        emergencyContactPhone: ecPhone,
        handicapIndex: noHandicap ? '0' : handicap,
        handicapBody: body,
        handicapNumber: noHandicap ? '' : memberNo,
        homeClub,
        preferredTee: tee,
        dietary: dietNotes.trim() ? [...dietary.filter(d => d !== 'None'), dietNotes.trim()] : dietary,
        shirtSize: shirt,
        membership: membership as 'Member' | 'Guest',
      })
    }, 1200)
  }

  function back() {
    setErrors({})
    if (step === 0) navigate('/signup')
    else setStep(step - 1)
  }

  const firstName = basics.fullName.split(/\s+/)[0]
  const isLast = step === STEPS.length - 1

  return (
    <div className="min-h-screen bg-canvas">
      <header className="h-20 px-6 lg:px-10 flex items-center justify-between max-w-[1180px] mx-auto">
        <Wordmark />
        <span className="text-[13px] font-bold font-display text-gray-500">Step 2 of 2 · Golfer profile</span>
      </header>

      <div className="max-w-[1180px] mx-auto px-6 lg:px-10 pb-16 grid lg:grid-cols-[300px_minmax(0,1fr)] gap-8 lg:gap-12">
        {/* Stepper */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="bg-ink rounded-[28px] p-6 relative overflow-hidden">
            <div
              className="absolute -right-12 -top-16 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(200,236,90,0.25) 0%, rgba(200,236,90,0) 70%)' }}
            />
            <p className="relative text-white/55 text-[13px] font-medium">Welcome, {firstName} 👋</p>
            <h1 className="relative font-display font-extrabold text-white text-[24px] leading-tight tracking-tight mt-1">
              Set up your golfer profile
            </h1>
            <ol className="relative mt-6 space-y-2">
              {STEPS.map((s, i) => {
                const done = i < step
                const current = i === step
                return (
                  <li key={s.title}>
                    <button
                      type="button"
                      disabled={i > step}
                      onClick={() => { setErrors({}); setStep(i) }}
                      className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
                        current ? 'bg-white/[0.08]' : done ? 'hover:bg-white/[0.05]' : 'opacity-50 cursor-default'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold font-display flex-shrink-0 ${
                        done ? 'bg-lime-400 text-ink' : current ? 'bg-white text-ink' : 'bg-white/10 text-white/70'
                      }`}>
                        {done ? '✓' : i + 1}
                      </span>
                      <span>
                        <span className="block text-white text-[14px] font-bold font-display tracking-tight">{s.title}</span>
                        <span className="block text-white/45 text-[12px] leading-snug">{s.subtitle}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        </aside>

        {/* Form */}
        <div key={step} className="page-in">
          <div className="flex gap-1.5 mb-6 lg:hidden">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-lime-500' : 'bg-black/[0.08]'}`} />
            ))}
          </div>
          <h2 className="font-display font-extrabold text-ink text-[32px] tracking-tight">{STEPS[step].title}</h2>
          <p className="text-gray-500 mt-1 mb-7">{STEPS[step].subtitle}</p>

          <div className="space-y-5">
            {step === 0 && (
              <>
                <Section title="Personal details">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold text-gray-600 font-display">Date of birth</label>
                      <input
                        type="date"
                        value={dob}
                        onChange={e => { setDob(e.target.value); clear('dob') }}
                        max={new Date().toISOString().split('T')[0]}
                        className={`${fieldClass(!!errors.dob)} ${dob ? '' : 'text-gray-400'}`}
                      />
                      {errors.dob && <p className="text-xs text-red-500 font-medium">{errors.dob}</p>}
                    </div>
                  </div>
                  <ChoiceChips label="Gender" options={GENDERS} value={gender}
                    onChange={v => { setGender(v as string); clear('gender') }} error={errors.gender} />
                </Section>
                <Section title="Emergency contact">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Input label="Contact name" placeholder="Full name" value={ecName}
                      onChange={e => { setEcName(e.target.value); clear('ecName') }} error={errors.ecName} autoComplete="off" />
                    <Input label="Contact phone" type="tel" placeholder="+1 (404) 555-0000" value={ecPhone}
                      onChange={e => { setEcPhone(e.target.value); clear('ecPhone') }} error={errors.ecPhone} autoComplete="off" />
                  </div>
                </Section>
              </>
            )}

            {step === 1 && (
              <>
                <Section title="Handicap">
                  <div className="grid sm:grid-cols-3 gap-5">
                    <SelectField label="Handicap issuing body" placeholder="Select issuing body" value={body}
                      onChange={v => { setBody(v); clear('body'); clear('handicap') }} options={HANDICAP_BODIES} error={errors.body} />
                    {!noHandicap && (
                      <>
                        <Input label="Handicap index" type="number" placeholder="e.g. 12.4" value={handicap}
                          onChange={e => { setHandicap(e.target.value); clear('handicap') }} error={errors.handicap} step="0.1" />
                        <Input label="Member number" placeholder="Optional" value={memberNo}
                          onChange={e => setMemberNo(e.target.value)} />
                      </>
                    )}
                  </div>
                  {noHandicap && (
                    <p className="text-sm text-gray-500 bg-canvas rounded-2xl px-4 py-3 leading-relaxed">
                      No problem — you can add your handicap later from your profile. Some tournaments require an official handicap to enter.
                    </p>
                  )}
                </Section>
                <Section title="Where you play">
                  <Input label="Home club / home course" placeholder="e.g. Augusta Pines Golf Club" value={homeClub}
                    onChange={e => setHomeClub(e.target.value)} hint="Optional" />
                  <ChoiceChips label="Preferred tee" options={TEES} value={tee}
                    onChange={v => { setTee(v as string); clear('tee') }} error={errors.tee} />
                </Section>
              </>
            )}

            {step === 2 && (
              <>
                <Section title="Catering">
                  <ChoiceChips label="Dietary restrictions" options={DIETARY} value={dietary}
                    onChange={v => { setDietary(v as string[]); clear('dietary') }} error={errors.dietary} hint="Select all that apply" />
                  <Input label="Anything else?" placeholder="Allergies or other requirements (optional)" value={dietNotes}
                    onChange={e => setDietNotes(e.target.value)} />
                </Section>
                <div className="grid md:grid-cols-2 gap-5">
                  <Section title="Player pack">
                    <ChoiceChips label="Shirt / apparel size" options={SHIRT_SIZES} value={shirt}
                      onChange={v => { setShirt(v as string); clear('shirt') }} error={errors.shirt} />
                  </Section>
                  <Section title="Membership">
                    <div className="grid grid-cols-2 gap-2.5">
                      {(['Member', 'Guest'] as const).map(m => {
                        const on = membership === m
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => { setMembership(m); clear('membership') }}
                            aria-pressed={on}
                            aria-label={m}
                            className={`text-left rounded-2xl p-4 transition-all ${
                              on ? 'bg-ink text-white' : `bg-canvas text-ink hover:bg-gray-200/70 ${errors.membership ? 'ring-1 ring-red-300' : ''}`
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-display font-bold text-[15px] tracking-tight">{m}</span>
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${on ? 'bg-lime-400' : 'border-2 border-black/15'}`}>
                                {on && <span className="w-2 h-2 rounded-full bg-ink" />}
                              </span>
                            </div>
                            <p className={`text-[12px] mt-1.5 leading-snug ${on ? 'text-white/60' : 'text-gray-500'}`}>
                              {m === 'Member' ? 'I belong to a participating club' : 'Playing as a visitor'}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                    {errors.membership && <p className="text-xs text-red-500 font-medium">{errors.membership}</p>}
                  </Section>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mt-8">
            <Button variant="secondary" onClick={back}>Back</Button>
            <Button onClick={next} loading={saving} className="min-w-[200px]">
              {saving ? 'Setting up your profile…' : isLast ? 'Finish setup' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
