import { useState, type FormEvent } from 'react'
import { Button, Input } from './components'
import { formatMoney } from './golf'
import { Modal } from './ops-ui'

/*
 * Entry-fee checkout. The client wants online payment as early as possible; the team chose Stripe
 * (it covers most countries and card networks; Interac support still to confirm). In production
 * these fields are Stripe Elements, so card details never touch our servers.
 */

const digits = (v: string) => v.replace(/\D/g, '')
const cardFormat = (v: string) => digits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
const expiryFormat = (v: string) => { const d = digits(v).slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d }

export function PaymentSheet({ title, lines, total, currency, onPaid, onClose }: {
  title: string
  lines: [string, string][]
  total: number
  currency: string
  onPaid: () => void
  onClose: () => void
}) {
  const [card, setCard] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState<'idle' | 'paying' | 'declined'>('idle')

  function pay(e?: FormEvent) {
    e?.preventDefault()
    if (digits(card).length < 15) return setError('Enter the full card number')
    if (digits(expiry).length < 4) return setError('Enter the expiry date')
    if (digits(cvc).length < 3) return setError('Enter the security code')
    if (!name.trim()) return setError('Enter the name on the card')
    setError('')
    setState('paying')
    // Stripe test cards: 4000 0000 0000 0002 is declined; anything else succeeds in the prototype
    setTimeout(() => {
      if (digits(card) === '4000000000000002') return setState('declined')
      onPaid()
      onClose()
    }, 1300)
  }

  return (
    <Modal title={title} subtitle="Secure payment by Stripe. You’ll get a receipt by email." onClose={onClose}
      footer={<>
        <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
        <Button fullWidth loading={state === 'paying'} onClick={() => pay()}>{state === 'paying' ? 'Paying…' : `Pay ${formatMoney(total, currency)}`}</Button>
      </>}>
      <div className="rounded-2xl bg-canvas px-4 py-3 space-y-1.5">
        {lines.map(([label, value]) => (
          <div key={label} className="flex justify-between text-[13px]"><span className="text-gray-500">{label}</span><span className="font-semibold text-ink">{value}</span></div>
        ))}
        <div className="flex justify-between pt-2 border-t border-black/[0.06] text-[15px]"><span className="font-bold text-ink">Total</span><span className="font-display font-extrabold text-ink">{formatMoney(total, currency)}</span></div>
      </div>
      {state === 'declined' && <p className="rounded-2xl bg-rose-50 text-rose-700 text-[13px] font-semibold px-4 py-3">Your card was declined. Try another card — nothing was charged.</p>}
      <form onSubmit={pay} className="space-y-3" noValidate>
        <Input label="Card number" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" value={card} onChange={e => setCard(cardFormat(e.target.value))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Expiry" inputMode="numeric" autoComplete="cc-exp" placeholder="MM / YY" value={expiry} onChange={e => setExpiry(expiryFormat(e.target.value))} />
          <Input label="Security code" inputMode="numeric" autoComplete="cc-csc" placeholder="CVC" value={cvc} onChange={e => setCvc(digits(e.target.value).slice(0, 4))} />
        </div>
        <Input label="Name on card" autoComplete="cc-name" value={name} error={error} onChange={e => setName(e.target.value)} />
        <button type="submit" hidden />
      </form>
      <p className="text-[11px] text-gray-400 leading-relaxed">Prototype: no real payment is taken. Stripe test card 4242 4242 4242 4242 succeeds; 4000 0000 0000 0002 is declined.</p>
    </Modal>
  )
}
