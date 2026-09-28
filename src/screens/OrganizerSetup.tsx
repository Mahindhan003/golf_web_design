import { useState, type ReactNode } from 'react'
import { Button, Input, SelectField, ChoiceChips } from '../components'
import { Wordmark } from '../shell'
import { useApp } from '../app-context'
import { navigate } from '../router'
import { MOCK_COURSES } from '../data'
import { ORG_TYPES, registerOrganizer, type OrgType } from '../admin/access'

const COUNTRIES = ['United States', 'United Kingdom', 'Ireland', 'Canada', 'Australia', 'New Zealand', 'South Africa', 'Spain', 'Portugal', 'Japan', 'India']
const EVENTS_PER_YEAR = ['1–5', '6–10', '10–25', '25+']
const NO_COURSE = '__none'

const STEPS = [
  { title: 'Organisation details', subtitle: 'Who you are and how golfers and our team can reach you' },
  { title: 'Review & submit', subtitle: 'Check your details before sending them for approval' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-3xl shadow-card p-6">
      <h3 className="text-[17px] text-ink font-bold font-display tracking-tight mb-4">{title}</h3>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-6 py-3">
      <dt className="text-[14px] text-gray-500">{label}</dt>
      <dd className="text-[14px] font-semibold text-ink text-right">{value || '—'}</dd>
    </div>
  )
}

export default function OrganizerSetup() {
  const { basics, completeOrganizerSetup } = useApp()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [name, setName]         = useState('')
  const [type, setType]         = useState<OrgType | ''>('')
  const [email, setEmail]       = useState(basics?.email ?? '')
  const [phone, setPhone]       = useState(basics?.phone ?? '')
  const [website, setWebsite]   = useState('')
  const [city, setCity]         = useState('')
  const [region, setRegion]     = useState('')
  const [country, setCountry]   = useState('United States')
  const [homeCourse, setHome]   = useState('')
  const [events, setEvents]     = useState('')
  const [agreed, setAgreed]     = useState(false)

  // Setup only makes sense straight after the organiser login step
  if (!basics || basics.accountType !== 'organizer' || !basics.password) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-display font-extrabold text-ink text-[28px] tracking-tight">Start by creating your organiser account</h1>
        <p className="text-gray-500">Your organisation details come right after your login details.</p>
        <Button onClick={() => navigate('/signup', { replace: true })}>Go to sign up</Button>
      </div>
    )
  }

  const clear = (f: string) => { if (errors[f]) setErrors(x => ({ ...x, [f]: '' })) }

  function validateDetails() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Organisation name is required'
    if (!type) e.type = 'Choose what kind of organisation you are'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid contact email'
    if (phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a valid phone number'
    if (website.trim() && !/^[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(website.trim().replace(/^https?:\/\//, ''))) e.website = 'Enter a website like yourclub.com'
    if (!city.trim()) e.city = 'City is required'
    if (!region.trim()) e.region = 'State / region is required'
    return e
  }

  function next() {
    if (step === 0) {
      const e = validateDetails()
      setErrors(e)
      if (Object.values(e).some(Boolean)) return
      setStep(1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!agreed) { setErrors({ agreed: 'Please confirm the organiser terms' }); return }

    setSaving(true)
    setTimeout(() => {
      const r = registerOrganizer({
        fullName: basics!.fullName,
        email: basics!.email,
        phone: basics!.phone,
        password: basics!.password!,
        org: {
          name: name.trim(),
          type: type as OrgType,
          email: email.trim(),
          phone: phone.trim(),
          website: website.trim().replace(/^https?:\/\//, '') || undefined,
          city: city.trim(),
          region: region.trim(),
          country,
          homeCourseId: homeCourse && homeCourse !== NO_COURSE ? homeCourse : undefined,
          eventsPerYear: events || undefined,
        },
      })
      setSaving(false)
      if (!r.ok) { setErrors({ submit: r.reason }); setStep(0); return }
      completeOrganizerSetup(r.userId!)
    }, 1100)
  }

  const courseName = MOCK_COURSES.find(c => c.id === homeCourse)?.name

  return (
    <div className="min-h-screen bg-canvas">
      <header className="h-20 px-6 lg:px-10 flex items-center justify-between max-w-[1180px] mx-auto">
        <Wordmark />
        <span className="text-[13px] font-bold font-display text-gray-500">Step 3 of 3 · Your organisation</span>
      </header>

      <div className="max-w-[1180px] mx-auto px-6 lg:px-10 pb-16 grid lg:grid-cols-[300px_minmax(0,1fr)] gap-8 lg:gap-12">
        {/* Stepper */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="bg-ink rounded-[28px] p-6 relative overflow-hidden">
            <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(200,236,90,0.25) 0%, rgba(200,236,90,0) 70%)' }} />
            <p className="relative text-white/55 text-[13px] font-medium">Welcome, {basics.fullName.split(/\s+/)[0]} 👋</p>
            <h1 className="relative font-display font-extrabold text-white text-[24px] leading-tight tracking-tight mt-1">
              Register your organisation
            </h1>
            <ol className="relative mt-6 space-y-2">
              {STEPS.map((s, i) => {
                const done = i < step
                const current = i === step
                return (
                  <li key={s.title}>
                    <button type="button" disabled={i > step} onClick={() => setStep(i)}
                      className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${current ? 'bg-white/[0.08]' : done ? 'hover:bg-white/[0.05]' : 'opacity-50 cursor-default'}`}>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold font-display flex-shrink-0 ${done ? 'bg-lime-400 text-ink' : current ? 'bg-white text-ink' : 'bg-white/10 text-white/70'}`}>
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
            <div className="relative mt-6 rounded-2xl bg-white/[0.06] p-4">
              <p className="text-white text-[13px] font-bold font-display">What happens next</p>
              <ul className="text-white/55 text-[12px] leading-relaxed mt-2 space-y-1.5 list-disc pl-4">
                <li>You're signed straight into the organiser console.</li>
                <li>Draft tournaments while our team reviews your details (usually 1–2 working days).</li>
                <li>Once approved, publish events and invite your team.</li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Form */}
        <div key={step} className="page-in">
          <h2 className="font-display font-extrabold text-ink text-[32px] tracking-tight">{STEPS[step].title}</h2>
          <p className="text-gray-500 mt-1 mb-7">{STEPS[step].subtitle}</p>

          {errors.submit && (
            <div role="alert" className="mb-5 bg-rose-50 text-rose-700 rounded-2xl px-5 py-4 text-sm font-semibold font-display">{errors.submit}</div>
          )}

          {step === 0 && (
            <div className="space-y-5">
              <Section title="About your organisation">
                <Input label="Organisation name" placeholder="e.g. Savannah Golf Club" value={name}
                  onChange={e => { setName(e.target.value); clear('name') }} error={errors.name} />
                <ChoiceChips label="Organisation type" options={ORG_TYPES} value={type}
                  onChange={v => { setType(v as OrgType); clear('type') }} error={errors.type} />
                <ChoiceChips label="Tournaments per year (optional)" options={EVENTS_PER_YEAR} value={events}
                  onChange={v => setEvents(v as string)} />
              </Section>

              <Section title="Contact">
                <div className="grid sm:grid-cols-2 gap-5">
                  <Input label="Contact email" type="email" value={email} onChange={e => { setEmail(e.target.value); clear('email') }} error={errors.email} hint="Shown to golfers on your tournaments" />
                  <Input label="Contact phone" type="tel" value={phone} onChange={e => { setPhone(e.target.value); clear('phone') }} error={errors.phone} />
                </div>
                <Input label="Website (optional)" placeholder="yourclub.com" value={website} onChange={e => { setWebsite(e.target.value); clear('website') }} error={errors.website} />
              </Section>

              <Section title="Location">
                <div className="grid sm:grid-cols-3 gap-5">
                  <Input label="City" value={city} onChange={e => { setCity(e.target.value); clear('city') }} error={errors.city} />
                  <Input label="State / region" value={region} onChange={e => { setRegion(e.target.value); clear('region') }} error={errors.region} />
                  <SelectField label="Country" value={country} onChange={setCountry} options={COUNTRIES} />
                </div>
                <SelectField
                  label="Home course (optional)"
                  placeholder="Select a course"
                  value={homeCourse}
                  onChange={setHome}
                  options={[...MOCK_COURSES.map(c => ({ value: c.id, label: c.name })), { value: NO_COURSE, label: 'Not listed — I’ll add it later' }]}
                />
              </Section>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <Section title="Your login">
                <dl className="divide-y divide-black/[0.05] -my-3">
                  <ReviewRow label="Name" value={basics.fullName} />
                  <ReviewRow label="Email" value={basics.email} />
                  <ReviewRow label="Role" value="Organizer (owner)" />
                </dl>
              </Section>
              <Section title="Organisation">
                <dl className="divide-y divide-black/[0.05] -my-3">
                  <ReviewRow label="Name" value={name} />
                  <ReviewRow label="Type" value={type} />
                  <ReviewRow label="Contact" value={`${email} · ${phone}`} />
                  <ReviewRow label="Website" value={website} />
                  <ReviewRow label="Location" value={`${city}, ${region}, ${country}`} />
                  <ReviewRow label="Home course" value={courseName ?? (homeCourse === NO_COURSE ? 'Add later' : '')} />
                  <ReviewRow label="Tournaments per year" value={events} />
                </dl>
              </Section>
              <label className={`flex items-start gap-3 rounded-2xl p-4 cursor-pointer ${errors.agreed ? 'bg-rose-50 ring-1 ring-rose-200' : 'bg-white shadow-card'}`}>
                <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); clear('agreed') }} className="mt-1 w-4 h-4 accent-[#0c1a12]" />
                <span className="text-[14px] text-gray-600 leading-relaxed">
                  I confirm I'm authorised to register <span className="font-semibold text-ink">{name}</span> and agree to the organiser terms.
                  Tournaments stay as drafts until the platform team approves this organisation.
                  {errors.agreed && <span className="block text-rose-600 text-[12px] font-semibold mt-1">{errors.agreed}</span>}
                </span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mt-8">
            <Button variant="secondary" onClick={() => (step === 0 ? navigate('/signup') : setStep(0))}>Back</Button>
            <Button onClick={next} loading={saving} className="min-w-[220px]">
              {saving ? 'Submitting…' : step === 0 ? 'Review details' : 'Submit for approval'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
