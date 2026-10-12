import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BRAND, formatPKR, type Booking, type BookingStatus } from '@gharfix/shared';
import { getMyBookings, errMsg } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { BookingBadge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

const C = BRAND.colors;

const TABS: { key: string; label: string; statuses: BookingStatus[] }[] = [
  { key: 'upcoming', label: 'Upcoming', statuses: ['pending', 'accepted', 'provider_assigned'] },
  { key: 'progress', label: 'In Progress', statuses: ['on_the_way', 'arrived', 'in_progress', 'awaiting_quote_approval', 'disputed'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
];

export default function BookingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setBookings(await getMyBookings());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const active = TABS.find((t) => t.key === tab)!;
  const filtered = bookings.filter((b) => active.statuses.includes(b.status));

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>My Bookings</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key }}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listInner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={`No ${active.label.toLowerCase()} bookings`}
            message="Bookings in this state will appear here."
            actionTitle="Book a service"
            onAction={() => router.push('/(customer)/search')}
          />
        ) : (
          filtered.map((b) => (
            <Pressable key={b.id} onPress={() => router.push({ pathname: '/(customer)/booking/[id]', params: { id: b.id } })}>
              <Card style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.ref}>{b.reference}</Text>
                  <BookingBadge status={b.status} />
                </View>
                <Text style={styles.desc} numberOfLines={2}>{b.description}</Text>
                <View style={styles.rowBetween}>
                  <Text style={styles.price}>{formatPKR(b.total_estimate)}</Text>
                  <Text style={styles.date}>{new Date(b.created_at).toLocaleDateString('en-PK')}</Text>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite, paddingTop: 52 },
  title: { fontSize: 24, fontWeight: '800', color: C.darkNavy, paddingHorizontal: 16, marginBottom: 12 },
  tabs: { maxHeight: 46 },
  tabRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab: { borderWidth: 1.5, borderColor: C.borderGray, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.pureWhite },
  tabActive: { borderColor: C.primary, backgroundColor: C.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: C.secondaryText },
  tabTextActive: { color: C.pureWhite },
  list: { flex: 1 },
  listInner: { padding: 16 },
  card: { marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 15, fontWeight: '800', color: C.darkNavy },
  desc: { fontSize: 13, color: C.secondaryText, marginTop: 6, lineHeight: 19 },
  price: { fontSize: 14, fontWeight: '700', color: C.primary, marginTop: 8 },
  date: { fontSize: 12, color: C.secondaryText, marginTop: 8 },
});
