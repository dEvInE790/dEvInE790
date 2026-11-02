import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { BadgeCheck, Banknote, Landmark, Percent, ShieldCheck, Wallet } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import { Input, Select } from '../../components/ui/Field'
import { ErrorState } from '../../components/ui/EmptyState'
import { Stagger, StaggerItem } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { getMyEarnings, getMyPayoutAccount, listPayoutBanks, resolvePayoutAccount, savePayoutAccount } from '../../lib/api'
import { dateShort, money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useSettings } from '../../context/SettingsContext'
import { ease } from '../../motion/variants'

/** Tutors connect the bank account their session earnings are paid into. */
export default function TutorPayouts() {
  const { profile } = useAuth()
  const toast = useToast()
  const { settings } = useSettings()
  const account = useAsync(() => getMyPayoutAccount(profile.id), [profile.id])
  const earnings = useAsync(getMyEarnings, [])
  const [editing, setEditing] = useState(false)
  const showForm = editing || (!account.loading && !account.data)
  const banks = useAsync(listPayoutBanks, [], { enabled: showForm })
  const [bank, setBank] = useState('')
  const [number, setNumber] = useState('')
  const [resolved, setResolved] = useState(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const rate = Math.round(Number(settings.commission_rate ?? 0.15) * 100)

  // Look up the account name as soon as a bank and 10 digits are entered.
  useEffect(() => {
    setResolved(null)
    if (!bank || !/^\d{10}$/.test(number)) return
    let cancelled = false
    setChecking(true)
    resolvePayoutAccount(bank, number)
      .then((r) => !cancelled && setResolved(r))
      .catch((e) => !cancelled && setResolved({ error: e.message }))
      .finally(() => !cancelled && setChecking(false))
    return () => { cancelled = true }
  }, [bank, number])

  const bankOptions = useMemo(() => banks.data ?? [], [banks.data])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const saved = await savePayoutAccount(bank, number)
      account.setData(saved)
      setEditing(false)
      setNumber('')
      toast.success(`Payouts will go to ${saved.bank_name} ••••${saved.account_number_last4}`)
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  const a = account.data
  const e = earnings.data
  return (
    <>
      <PageHeader title="Payouts" subtitle={`Learners pay through Paystack. Your share goes straight to your bank; TutorHaven keeps ${rate}%.`} />

      <Stagger onMount className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <StaggerItem className="relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white shadow-lift sm:p-8">
          <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-mint-400/20 blur-3xl" aria-hidden />
          {account.loading ? <Skeleton className="h-32 bg-white/10" /> : account.error ? <ErrorState message={account.error} onRetry={account.reload} /> : (
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-mint-300"><Landmark className="h-5 w-5" /></span>
                <Badge tone={a ? 'mint' : 'amber'}>{a ? 'Connected' : 'Not connected'}</Badge>
              </div>
              <p className="mt-6 text-sm text-navy-300">Payout account</p>
              {a ? (
                <>
                  <h2 className="text-2xl font-bold text-white">{a.account_name}</h2>
                  <p className="mt-1 text-navy-200">{a.bank_name} •••• {a.account_number_last4}</p>
                  <p className="mt-1 text-xs text-navy-300">Updated {dateShort(a.updated_at)}</p>
                  {!editing && <Button variant="light" className="mt-6" onClick={() => setEditing(true)}>Change bank account</Button>}
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white">Add your bank account</h2>
                  <p className="mt-2 text-navy-200">
                    {settings.payout_account_required !== false
                      ? 'You need a payout account before learners can find and book you.'
                      : 'Without one, your earnings are paid to you manually by TutorHaven.'}
                  </p>
                </>
              )}
            </div>
          )}
        </StaggerItem>

        <StaggerItem className="card grid grid-cols-2 gap-4 p-6 sm:p-8">
          {[
            [Wallet, 'This month', e?.this_month],
            [Banknote, 'All time', e?.total],
          ].map(([Icon, label, value]) => (
            <div key={label}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint-50 text-mint-700"><Icon className="h-5 w-5" /></span>
              <p className="mt-3 text-sm text-navy-500">{label}</p>
              {earnings.loading ? <Skeleton className="mt-1 h-7 w-20" /> : <p className="font-display text-2xl font-bold tabular-nums">{money(Number(value ?? 0))}</p>}
            </div>
          ))}
          <p className="col-span-2 flex items-start gap-2 rounded-xl bg-cream-100 p-3 text-xs text-navy-600">
            <Percent className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
            You earn {100 - rate}% of your listed price on every paid session, even when a learner uses a membership discount. Paystack usually pays out the next working day.
          </p>
          {Number(e?.awaiting_manual_payout) > 0 && (
            <p className="col-span-2 text-xs text-[#8a5a00]">{money(Number(e.awaiting_manual_payout))} from sessions before you connected a bank will be paid by TutorHaven.</p>
          )}
        </StaggerItem>
      </Stagger>

      {showForm && (
        <motion.form onSubmit={save} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }} className="card mt-6 space-y-5 p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">{a ? 'Change bank account' : 'Connect your bank account'}</h2>
            <p className="mt-1 text-sm text-navy-500">We check the account name with your bank through Paystack. Use an account in your own name.</p>
          </div>
          {banks.error ? <ErrorState message={banks.error} onRetry={banks.reload} /> : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Bank" value={bank} onChange={(ev) => setBank(ev.target.value)} disabled={banks.loading} required>
                <option value="">{banks.loading ? 'Loading banks…' : 'Choose your bank'}</option>
                {bankOptions.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </Select>
              <Input label="Account number" inputMode="numeric" maxLength={10} value={number} onChange={(ev) => setNumber(ev.target.value.replace(/\D/g, ''))} placeholder="10 digits" required />
            </div>
          )}
          <div aria-live="polite" className="min-h-6 text-sm">
            {checking ? <span className="text-navy-500">Checking account…</span>
              : resolved?.error ? <span className="text-coral-600">{resolved.error}</span>
              : resolved?.account_name ? <span className="flex items-center gap-2 font-semibold text-mint-700"><BadgeCheck className="h-4 w-4" />{resolved.account_name}</span>
              : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={saving} disabled={!resolved?.account_name}>Save payout account</Button>
            {a && <Button variant="ghost" onClick={() => { setEditing(false); setNumber(''); setBank('') }}>Cancel</Button>}
            <span className="flex items-center gap-1.5 text-xs text-navy-400"><ShieldCheck className="h-3.5 w-3.5" />Only the last 4 digits are stored by TutorHaven.</span>
          </div>
        </motion.form>
      )}
    </>
  )
}
