import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BRAND, formatPKR, type Booking, type BookingStatus } from '@gharfix/shared';
import { getMyProviderProfile, getProviderJobs, getOpenRequests, getMyProviderServiceIds, errMsg } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { BookingBadge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { SectionHeader } from '../../components/ui/SectionHeader';

const C = BRAND.colors;

const TABS: { key: string; label: string; statuses: BookingStatus[] }[] = [
  { key: 'requests', label: 'Requests', statuses: ['pending'] },
  { key: 'active', label: 'Active', statuses: ['accepted', 'provider_assigned', 'on_the_way', 'arrived', 'in_progress', 'awaiting_quote_approval', 'disputed'] },
  { key: 'done', label: 'Completed', statuses: ['completed', 'cancelled'] },
];

export default function JobsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('requests');
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const p = await getMyProviderProfile();
      if (!p) {
        setJobs([]);
        setRequests([]);
        return;
      }
      const [mine, serviceIds] = await Promise.all([getProviderJobs(p.user_id), getMyProviderServiceIds()]);
      setJobs(mine);
      setRequests(await getOpenRequests(p.user_id, serviceIds));
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
  const list = tab === 'requests' ? requests : jobs.filter((j) => active.statuses.includes(j.status));

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Jobs</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key }}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.inner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
        ) : list.length === 0 ? (
          <EmptyState
            title={tab === 'requests' ? 'No open requests' : `No ${active.label.toLowerCase()} jobs`}
            message={tab === 'requests' ? 'New booking requests matching your services will appear here.' : 'Jobs in this state will appear here.'}
          />
        ) : (
          <View>
            {tab === 'requests' ? <SectionHeader title={`${list.length} open request(s)`} /> : null}
            {list.map((j) => (
              <Pressable key={j.id} onPress={() => router.push({ pathname: '/(provider)/job/[id]', params: { id: j.id } })}>
                <Card style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.ref}>{j.reference}</Text>
                    <BookingBadge status={j.status} />
                  </View>
                  <Text style={styles.desc} numberOfLines={2}>{j.description}</Text>
                  <Text style={styles.meta}>
                    {j.scheduled_at ? new Date(j.scheduled_at).toLocaleString('en-PK') : j.asap ? 'ASAP' : ''} • {formatPKR(j.total_estimate)}
                    {j.urgency === 'urgent' ? ' • URGENT' : ''}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
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
  inner: { padding: 16 },
  card: { marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 15, fontWeight: '800', color: C.darkNavy },
  desc: { fontSize: 13, color: C.secondaryText, marginTop: 6, lineHeight: 19 },
  meta: { fontSize: 12, color: C.secondaryText, marginTop: 6 },
});
