import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput as RNTextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { BRAND, formatPKR, type ServiceCategory } from '@gharfix/shared';
import { getCategories, searchProviders, type ProviderCard, errMsg } from '../../lib/api';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { RatingStars } from '../../components/ui/RatingStars';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';

const C = BRAND.colors;

function ProviderRow({ card, onPress }: { card: ProviderCard; onPress: () => void }) {
  const verified = card.profile.verification_status === 'approved';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={card.profile.display_name}>
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{card.profile.display_name}</Text>
          {verified ? <Badge status="verified" /> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {card.services.slice(0, 3).map((s) => s.name).join(' • ')}
        </Text>
        <View style={styles.rowBetween}>
          <RatingStars rating={card.profile.rating_avg} showValue />
          <Text style={styles.price}>
            {card.startingPrice != null ? `from ${formatPKR(card.startingPrice)}` : 'Quote-based'}
          </Text>
        </View>
        <Text style={styles.area}>{card.profile.city}</Text>
      </Card>
    </Pressable>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; categoryId?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string | undefined>(params.categoryId);
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState('');
  const [providers, setProviders] = useState<ProviderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    try {
      setError(null);
      const max = maxPrice.trim() === '' ? undefined : Number(maxPrice);
      const results = await searchProviders({
        categoryId,
        minRating: minRating || undefined,
        maxPrice: max != null && Number.isFinite(max) && max > 0 ? max : undefined,
      });
      const q = query.trim().toLowerCase();
      setProviders(
        q
          ? results.filter(
              (p) =>
                p.profile.display_name.toLowerCase().includes(q) ||
                p.services.some((s) => s.name.toLowerCase().includes(q)),
            )
          : results,
      );
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [query, categoryId, minRating, maxPrice]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      runSearch();
    }, [runSearch]),
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search providers or services…" onSubmit={runSearch} />
      </View>
      <ScrollView style={styles.filters} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <FilterChip label="All" active={!categoryId} onPress={() => setCategoryId(undefined)} />
        {categories.map((c) => (
          <FilterChip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? undefined : c.id)} />
        ))}
      </ScrollView>
      <View style={styles.filterRow2}>
        <FilterChip label="4★ & up" active={minRating === 4} onPress={() => setMinRating(minRating === 4 ? 0 : 4)} />
        <Text style={styles.priceLabel}>Max PKR:</Text>
        <RNTextInput
          style={styles.priceInput}
          value={maxPrice}
          onChangeText={(t) => setMaxPrice(t.replace(/[^0-9]/g, ''))}
          placeholder="Any"
          placeholderTextColor={C.secondaryText}
          keyboardType="number-pad"
          returnKeyType="search"
          onSubmitEditing={runSearch}
          accessibilityLabel="Maximum price in PKR"
        />
      </View>
      <ScrollView style={styles.results} contentContainerStyle={styles.resultsInner}>
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={runSearch} />
        ) : providers.length === 0 ? (
          <EmptyState
            title="No providers found"
            message="Try a different search, category, or widen your filters. New providers join every week."
            actionTitle="Clear filters"
            onAction={() => { setQuery(''); setCategoryId(undefined); setMinRating(0); setMaxPrice(''); }}
          />
        ) : (
          providers.map((p) => (
            <ProviderRow
              key={p.profile.user_id}
              card={p}
              onPress={() => router.push({ pathname: '/(customer)/provider/[id]', params: { id: p.profile.user_id } })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite, paddingTop: 52 },
  header: { paddingHorizontal: 16, marginBottom: 8 },
  filters: { maxHeight: 44 },
  filterRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterRow2: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { borderWidth: 1.5, borderColor: C.borderGray, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: C.pureWhite },
  chipActive: { borderColor: C.primary, backgroundColor: C.lightGreen },
  chipText: { fontSize: 13, fontWeight: '600', color: C.secondaryText },
  chipTextActive: { color: C.deepGreen },
  priceLabel: { fontSize: 13, color: C.secondaryText, marginLeft: 4 },
  priceInput: {
    borderWidth: 1.5, borderColor: C.borderGray, borderRadius: 999, paddingHorizontal: 12,
    paddingVertical: 7, backgroundColor: C.pureWhite, fontSize: 13, fontWeight: '600',
    color: C.darkNavy, minWidth: 90, textAlign: 'center',
  },
  results: { flex: 1 },
  resultsInner: { padding: 16 },
  card: { marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: C.darkNavy, flex: 1, marginRight: 8 },
  meta: { fontSize: 13, color: C.secondaryText, marginTop: 4 },
  price: { fontSize: 14, fontWeight: '700', color: C.primary },
  area: { fontSize: 12, color: C.secondaryText, marginTop: 4 },
});
