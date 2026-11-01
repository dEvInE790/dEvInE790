import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Search, SearchX, SlidersHorizontal, X } from 'lucide-react-native'
import Screen from '../../components/Screen'
import TutorCard, { TutorCardSkeleton } from '../../components/TutorCard'
import Sheet from '../../components/Sheet'
import NoTutorsYet from '../../components/NoTutorsYet'
import { Button, Chip, ChipGroup, EmptyState, Field, Segmented, Tappable, Text } from '../../components/ui'
import useAsync from '../../lib/useAsync'
import { searchTutors } from '../../lib/api'
import { LEVELS, SUBJECTS } from '../../lib/constants'
import { money } from '../../lib/format'
import { colors } from '../../theme'

const PRICES = [0, 5000, 8000, 10000, 15000]

export default function Explore() {
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [maxRate, setMaxRate] = useState(0)
  const [sort, setSort] = useState('rating')
  const [filters, setFilters] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setQ(draft.trim()), 350)
    return () => clearTimeout(t)
  }, [draft])
  const results = useAsync(() => searchTutors({ q, subject, level, maxRate: maxRate || null, sort }), [q, subject, level, maxRate, sort])
  const activeCount = [level, maxRate].filter(Boolean).length

  return (
    <Screen title="Find your tutor" subtitle="Verified tutors, real reviews, naira pricing." onRefresh={() => results.reload()} refreshing={false}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field icon={Search} value={draft} onChangeText={setDraft} placeholder="Name, subject or keyword" style={{ flex: 1 }} returnKeyType="search" />
        <Tappable onPress={() => setFilters(true)} accessibilityRole="button" accessibilityLabel="Filters" style={styles.filterBtn}>
          <SlidersHorizontal size={20} color={colors.navy900} />
          {activeCount > 0 && <View style={styles.dot}><Text style={{ color: colors.white, fontSize: 10 }}>{activeCount}</Text></View>}
        </Tappable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }}>
        <View style={{ width: 12 }} />
        {['All', ...SUBJECTS].map((s) => <Chip key={s} size="sm" label={s} selected={(subject || 'All') === s} onPress={() => setSubject(s === 'All' ? '' : s)} />)}
        <View style={{ width: 12 }} />
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="small">{results.data ? `${results.data.length} tutor${results.data.length === 1 ? '' : 's'} found` : ' '}</Text>
        <Segmented value={sort} onChange={setSort} options={[{ value: 'rating', label: 'Top rated' }, { value: 'price_asc', label: 'Lowest price' }]} />
      </View>
      {results.error ? <Text style={{ color: colors.coralInk }}>{results.error}</Text>
        : results.loading && !results.data ? [0, 1, 2].map((i) => <TutorCardSkeleton key={i} />)
          : results.data.length === 0 && !q && !subject && !level && !maxRate ? (
            <NoTutorsYet />
          ) : results.data.length === 0 ? (
            <EmptyState icon={SearchX} title="No tutors match" body="Try another subject, a higher budget or a different keyword."
              action={<Button title="Reset filters" variant="secondary" onPress={() => { setDraft(''); setSubject(''); setLevel(''); setMaxRate(0) }} />} />
          ) : (
            <View style={{ gap: 12, opacity: results.loading ? 0.6 : 1 }}>
              {results.data.map((t, i) => <TutorCard key={t.id} tutor={t} index={i} />)}
            </View>
          )}
      <Sheet visible={filters} onClose={() => setFilters(false)} title="Filters">
        <Text variant="label">Level</Text>
        <ChipGroup size="sm" multiple={false} options={['Any', ...LEVELS]} value={level || 'Any'} onChange={(v) => setLevel(v === 'Any' ? '' : v)} />
        <Text variant="label">Max hourly rate</Text>
        <ChipGroup size="sm" multiple={false} options={PRICES.map((p) => (p ? `Up to ${money(p)}` : 'Any price'))} value={maxRate ? `Up to ${money(maxRate)}` : 'Any price'}
          onChange={(v) => setMaxRate(PRICES.find((p) => (p ? `Up to ${money(p)}` : 'Any price') === v) ?? 0)} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <Button title="Reset" variant="secondary" icon={X} style={{ flex: 1 }} onPress={() => { setLevel(''); setMaxRate(0) }} />
          <Button title={`Show ${results.data?.length ?? ''} tutors`} style={{ flex: 1 }} onPress={() => setFilters(false)} />
        </View>
      </Sheet>
    </Screen>
  )
}

const styles = StyleSheet.create({
  filterBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: 'rgba(15,28,54,0.12)', alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center' },
})
