import { useEffect, useMemo, useState } from 'react'
import { FlatList, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { BadgeCheck, ChevronDown, Landmark, Percent, Search, ShieldCheck } from 'lucide-react-native'
import Screen from '../components/Screen'
import Sheet from '../components/Sheet'
import { Badge, Button, Card, Field, Skeleton, Tappable, Text } from '../components/ui'
import useAsync from '../lib/useAsync'
import { getMyEarnings, getMyPayoutAccount, listPayoutBanks, resolvePayoutAccount, savePayoutAccount } from '../lib/api'
import { searchBanks } from '../lib/banks'
import { dateShort, money } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useToast } from '../context/ToastContext'
import { colors, fonts, radius, shadow } from '../theme'

/** Tutors connect the bank account their session earnings are paid into. */
export default function Payouts() {
  const { profile } = useAuth()
  const { settings } = useSettings()
  const toast = useToast()
  const account = useAsync(() => getMyPayoutAccount(profile.id), [profile.id])
  const earnings = useAsync(getMyEarnings, [])
  const [editing, setEditing] = useState(false)
  const showForm = editing || (!account.loading && !account.data)
  const banks = useAsync(listPayoutBanks, [], { enabled: showForm })
  const [bank, setBank] = useState(null)
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')
  const [number, setNumber] = useState('')
  const [resolved, setResolved] = useState(null)
  const [saving, setSaving] = useState(false)
  const rate = Math.round(Number(settings.commission_rate ?? 0.15) * 100)

  useEffect(() => {
    if (!bank || !/^\d{10}$/.test(number)) return
    let cancelled = false
    resolvePayoutAccount(bank.code, number)
      .then((r) => !cancelled && setResolved({ key: bank.code + number, ...r }))
      .catch((e) => !cancelled && setResolved({ key: bank.code + number, error: e.message }))
    return () => { cancelled = true }
  }, [bank, number])
  const current = resolved?.key === `${bank?.code}${number}` ? resolved : null
  const checking = !!bank && /^\d{10}$/.test(number) && !current

  // Popular banks first; nicknames like GTB, UBA or Opay work in the search.
  const rows = useMemo(() => {
    const all = banks.data ?? []
    const { popular, rest } = searchBanks(all, query)
    return popular.length
      ? [{ header: 'Popular' }, ...popular, { header: `All banks (${all.length})` }, ...rest]
      : rest
  }, [banks.data, query])

  const save = async () => {
    setSaving(true)
    try {
      const saved = await savePayoutAccount(bank.code, number)
      account.setData(saved)
      setEditing(false)
      setNumber('')
      toast.success(`Payouts will go to ${saved.bank_name} ••••${saved.account_number_last4}`)
    } catch (e) {
      toast.error(e.message)
    }
    setSaving(false)
  }

  const a = account.data
  const e = earnings.data
  return (
    <Screen back title="Payouts" subtitle={`Your share is paid straight to your bank. TutorHaven keeps ${rate}%.`} onRefresh={() => { account.reload(); earnings.reload() }}>
      {account.loading ? <Skeleton style={{ height: 150, borderRadius: 24 }} /> : (
        <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: colors.navy950, borderRadius: radius.xl, padding: 20, gap: 6, ...shadow.lift }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}><Landmark size={22} color={colors.mint300} /></View>
            <Badge tone={a ? 'mint' : 'amber'}>{a ? 'Connected' : 'Not connected'}</Badge>
          </View>
          <Text style={{ color: colors.navy300, fontSize: 13, marginTop: 8 }}>Payout account</Text>
          {a ? (
            <>
              <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: 22 }}>{a.account_name}</Text>
              <Text style={{ color: colors.navy200 }}>{a.bank_name} •••• {a.account_number_last4} · {dateShort(a.updated_at)}</Text>
              {!editing && <Button title="Change bank account" variant="light" size="sm" style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={() => setEditing(true)} />}
            </>
          ) : (
            <>
              <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: 22 }}>Add your bank account</Text>
              <Text style={{ color: colors.navy200 }}>
                {settings.payout_account_required !== false ? 'You need one before learners can find and book you.' : 'Without one, TutorHaven pays your earnings manually.'}
              </Text>
            </>
          )}
        </Animated.View>
      )}

      <Card delay={80} style={{ flexDirection: 'row', gap: 12 }}>
        {[['This month', e?.this_month], ['All time', e?.total]].map(([label, value]) => (
          <View key={label} style={{ flex: 1 }}>
            <Text variant="small">{label}</Text>
            {earnings.loading ? <Skeleton style={{ height: 26, width: 90, marginTop: 4 }} /> : <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.navy950 }}>{money(Number(value ?? 0))}</Text>}
          </View>
        ))}
      </Card>
      <View style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.cream200, borderRadius: 16, padding: 14 }}>
        <Percent size={16} color={colors.mint600} />
        <Text variant="muted" style={{ flex: 1, fontSize: 13 }}>You earn {100 - rate}% of your listed price on every paid session, even when the learner has a membership discount. Paystack usually pays out the next working day.</Text>
      </View>

      {showForm && (
        <Card delay={120} style={{ gap: 14 }}>
          <Text variant="h3">{a ? 'Change bank account' : 'Connect your bank account'}</Text>
          <Text variant="muted">We check the account name with your bank through Paystack. Use an account in your own name.</Text>
          <View style={{ gap: 6 }}>
            <Text variant="label">Bank</Text>
            <Tappable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel="Choose your bank"
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, height: 50, backgroundColor: colors.white }}>
              <Text style={{ color: bank ? colors.navy900 : colors.navy300 }}>{bank?.name ?? (banks.loading ? 'Loading banks…' : 'Choose your bank')}</Text>
              <ChevronDown size={18} color={colors.navy400} />
            </Tappable>
          </View>
          <Field label="Account number" value={number} onChangeText={(t) => setNumber(t.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" placeholder="10 digits" maxLength={10} />
          <View style={{ minHeight: 22 }} accessibilityLiveRegion="polite">
            {checking ? <Text variant="muted">Checking account…</Text>
              : current?.error ? <Text style={{ color: colors.coralInk }}>{current.error}</Text>
              : current?.account_name ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><BadgeCheck size={16} color={colors.mint700} /><Text style={{ color: colors.mint700, fontFamily: fonts.semibold }}>{current.account_name}</Text></View>
              : null}
          </View>
          <Button title="Save payout account" loading={saving} disabled={!current?.account_name} onPress={save} full />
          {a && <Button title="Cancel" variant="ghost" onPress={() => { setEditing(false); setNumber(''); setBank(null) }} />}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={14} color={colors.navy400} /><Text variant="small">TutorHaven only stores the last 4 digits.</Text></View>
        </Card>
      )}

      <Sheet visible={picking} onClose={() => setPicking(false)} title="Choose your bank">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 12 }}>
          <Search size={16} color={colors.navy400} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search (e.g. GTB, Opay, Zenith)" placeholderTextColor={colors.navy300} accessibilityLabel="Search banks" autoCorrect={false}
            style={{ flex: 1, height: 44, fontFamily: fonts.body, fontSize: 15, color: colors.navy900 }} />
        </View>
        {banks.error ? <Text style={{ color: colors.coralInk }}>{banks.error}</Text> : (
          <FlatList
            data={rows}
            keyExtractor={(b) => b.header ?? b.code}
            style={{ maxHeight: 380 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => item.header ? (
              <Text variant="eyebrow" style={{ color: colors.navy400, paddingTop: 12, paddingBottom: 4 }}>{item.header}</Text>
            ) : (
              <Tappable onPress={() => { setBank(item); setPicking(false); setQuery('') }} accessibilityRole="button" style={{ paddingVertical: 13, borderBottomWidth: 1, borderColor: colors.line }}>
                <Text style={{ color: colors.navy900 }}>{item.name}</Text>
              </Tappable>
            )}
            ListEmptyComponent={<Text variant="muted">{banks.loading ? 'Loading banks…' : 'No bank matches that search.'}</Text>}
          />
        )}
      </Sheet>
    </Screen>
  )
}
