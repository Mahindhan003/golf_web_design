import { useState, type FormEvent, type ReactNode } from 'react'
import { Button, Input, SelectField, ChoiceChips, Avatar, fieldClass } from '../components'
import { MOCK_PROFILE } from '../data'
import { PageHeader } from '../shell'
import { useApp } from '../app-context'
import { navigate } from '../router'
import { BackLink } from './TournamentDetails'

const COUNTRIES = ['United States', 'United Kingdom', 'Australia', 'Canada', 'South Africa', 'Ireland', 'Germany', 'France', 'Japan', 'New Zealand']
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const HANDICAP_BODIES = ['USGA (GHIN)', 'England Golf', 'Golf Australia', 'Golf Canada', 'Golf Ireland', 'Scottish Golf', 'Wales Golf', 'Other', 'No handicap yet']
const TEES = [
  { value: 'Black', swatch: '#111827' }, { value: 'Blue', swatch: '#2563eb' }, { value: 'White', swatch: '#ffffff' },
  { value: 'Gold', swatch: '#c9a227' }, { value: 'Red', swatch: '#dc2626' }, { value: 'Green', swatch: '#16a34a' },
]
const DIETARY = ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut allergy', 'Halal', 'Kosher']
const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-[28px] shadow-card p-6 lg:p-7">
      <h2 className="font-display font-bold text-ink text-[18px] tracking-tight mb-5">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

export default function EditProfile() {
  const { showToast, touchProfile } = useApp()
  const p = MOCK_PROFILE

  const [firstName, setFirstName] = useState(p.firstName)
  const [lastName, setLastName]   = useState(p.lastName)
  const [email, setEmail]         = useState(p.email)
  const [phone, setPhone]         = useState(p.phone)
  const [country, setCountry]     = useState(p.country)
  const [city, setCity]           = useState(p.city)
  const [dob, setDob]             = useState(p.dob)
  const [gender, setGender]       = useState(p.gender)
  const [handicap, setHandicap]   = useState(p.handicapIndex.toString())
  const [body, setBody]           = useState(p.handicapBody)
  const [memberNo, setMemberNo]   = useState(p.handicapNumber)
  const [homeClub, setHomeClub]   = useState(p.homeClub)
  const [tee, setTee]             = useState(p.preferredTee)
  const [dietary, setDietary]     = useState<string[]>(p.dietary)
  const [shirt, setShirt]         = useState(p.shirtSize)
  const [membership, setMembership] = useState(p.membership)
  const [ecName, setEcName]       = useState(p.emergencyContactName)
  const [ecPhone, setEcPhone]     = useState(p.emergencyContactPhone)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const clear = (f: string) => { if (errors[f]) setErrors(x => ({ ...x, [f]: '' })) }

  function validate() {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'First name is required'
    if (!lastName.trim())  e.lastName  = 'Last name is required'
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address'
    const hi = parseFloat(handicap)
    if (isNaN(hi) || hi < -10 || hi > 54) e.handicap = 'Enter a value between −10 and 54'
    if (!ecName.trim()) e.ecName = 'Contact name is required'
    if (ecPhone.replace(/\D/g, '').length < 7) e.ecPhone = 'Enter a valid phone number'
    return e
  }

  const errorCount = Object.values(errors).filter(Boolean).length

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return

    setSaving(true)
    setTimeout(() => {
      Object.assign(MOCK_PROFILE, {
        firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim(),
        country, city: city.trim(), dob, gender,
        handicapIndex: parseFloat(handicap), handicapBody: body, handicapNumber: memberNo.trim(),
        homeClub: homeClub.trim(), preferredTee: tee, dietary: dietary.length ? dietary : ['None'],
        shirtSize: shirt, membership,
        emergencyContactName: ecName.trim(), emergencyContactPhone: ecPhone.trim(),
        avatarInitials: `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`.toUpperCase(),
      })
      touchProfile()
      setSaving(false)
      showToast('Profile updated successfully')
      navigate('/profile')
    }, 1200)
  }

  const cancel = () => navigate('/profile')

  return (
    <form onSubmit={handleSubmit} noValidate className="page-in">
      <BackLink label="Profile" onClick={cancel} />
      <PageHeader title="Edit profile" />

      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
        <aside className="lg:sticky lg:top-8 bg-white rounded-[28px] shadow-card p-6 flex flex-col items-center text-center">
          <Avatar initials={`${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || p.avatarInitials} size="xl" />
          <p className="font-display font-bold text-ink text-[18px] tracking-tight mt-4">{firstName} {lastName}</p>
          <p className="text-[13px] text-gray-500">{email}</p>
          <button
            type="button"
            onClick={() => showToast('Photo upload coming soon', 'info')}
            className="mt-4 h-9 px-4 rounded-full bg-canvas text-ink text-[13px] font-semibold font-display hover:bg-gray-200 transition-colors"
          >
            Change photo
          </button>
        </aside>

        <div className="space-y-6">
          <Section title="Personal information">
            <div className="grid sm:grid-cols-2 gap-5">
              <Input label="First name" value={firstName} onChange={e => { setFirstName(e.target.value); clear('firstName') }} error={errors.firstName} autoComplete="given-name" />
              <Input label="Last name" value={lastName} onChange={e => { setLastName(e.target.value); clear('lastName') }} error={errors.lastName} autoComplete="family-name" />
              <Input label="Email address" type="email" value={email} onChange={e => { setEmail(e.target.value); clear('email') }} error={errors.email} autoComplete="email" />
              <Input label="Phone number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" />
              <SelectField label="Country" value={country} onChange={setCountry} options={COUNTRIES} placeholder="Select country" />
              <Input label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="City" autoComplete="address-level2" />
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-gray-600 font-display">Date of birth</label>
                <input type="date" value={dob} onChange={e => setDob(e.target.value)} max={new Date().toISOString().split('T')[0]} className={fieldClass(false)} />
              </div>
            </div>
            <ChoiceChips label="Gender" options={GENDERS} value={gender} onChange={v => setGender(v as string)} />
          </Section>

          <Section title="Golfer information">
            <div className="grid sm:grid-cols-3 gap-5">
              <SelectField label="Issuing body" value={body} onChange={setBody} options={HANDICAP_BODIES} />
              <Input label="Handicap index" type="number" step="0.1" value={handicap} onChange={e => { setHandicap(e.target.value); clear('handicap') }} error={errors.handicap} />
              <Input label="Member number" value={memberNo} onChange={e => setMemberNo(e.target.value)} placeholder="Optional" />
            </div>
            <Input label="Home club / home course" value={homeClub} onChange={e => setHomeClub(e.target.value)} placeholder="Optional" />
            <ChoiceChips label="Preferred tee" options={TEES} value={tee} onChange={v => setTee(v as string)} />
            <ChoiceChips label="Status" options={['Member', 'Guest']} value={membership} onChange={v => setMembership(v as 'Member' | 'Guest')} />
          </Section>

          <div className="grid md:grid-cols-2 gap-6 items-start">
            <Section title="Event preferences">
              <ChoiceChips label="Dietary restrictions" options={DIETARY} value={dietary} onChange={v => setDietary(v as string[])} hint="Select all that apply" />
              <ChoiceChips label="Shirt / apparel size" options={SHIRT_SIZES} value={shirt} onChange={v => setShirt(v as string)} />
            </Section>
            <Section title="Emergency contact">
              <Input label="Contact name" value={ecName} onChange={e => { setEcName(e.target.value); clear('ecName') }} error={errors.ecName} />
              <Input label="Contact phone" type="tel" value={ecPhone} onChange={e => { setEcPhone(e.target.value); clear('ecPhone') }} error={errors.ecPhone} />
            </Section>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 mt-8 z-10">
        <div className="bg-ink rounded-full shadow-float p-2 pl-6 flex items-center gap-3">
          <p className="flex-1 text-[13px] font-medium text-white/60 truncate">
            {errorCount > 0 ? <span className="text-rose-300">Please fix {errorCount} error{errorCount > 1 ? 's' : ''} above</span> : 'Review your details, then save your changes'}
          </p>
          <button type="button" onClick={cancel} className="h-11 px-5 rounded-full text-white/80 text-sm font-semibold font-display hover:bg-white/10">
            Cancel
          </button>
          <Button type="submit" loading={saving} className="bg-lime-400! text-ink! shadow-none!">
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}
