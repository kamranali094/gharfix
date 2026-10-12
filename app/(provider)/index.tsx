import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BRAND, formatPKR, VERIFICATION_STATUS_LABELS, type ProviderProfile, type Booking } from '@gharfix/shared';
import { useAuth } from '../../lib/auth';
import {
  getMyProviderProfile,
  getProviderJobs,
  getNotifications,
  errMsg,
} from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BookingBadge } from '../../components/ui/Badge';
import { RatingStars } from '../../components/ui/RatingStars';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

const C = BRAND.colors;

interface Stats {
  newRequests: number;
  todayCount: number;
  inProgress: number;
  monthEarnings: number;
  pendingSettlement: number;
}

export default function ProviderDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prov, setProv] = useState<ProviderProfile | null>(null);
  const [stats, setStats] = useState<Stats>({ newRequests: 0, todayCount: 0, inProgress: 0, monthEarnings: 0, pendingSettlement: 0 });
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      setError(null);
      const p = await getMyProviderProfile();
      setProv(p);
      if (p) {
        const jobs = await getProviderJobs(p.user_id);
        const today = new Date().toISOString().slice(0, 10);
        const monthStart = new Date().toISOString().slice(0, 7);
        const completed = jobs.filter((j) => j.status === 'completed');
        setStats({
          newRequests: jobs.filter((j) => j.status === 'pending').length,
          todayCount: jobs.filter((j) => j.scheduled_at?.slice(0, 10) === today && !['completed', 'cancelled'].includes(j.status)).length,
          inProgress: jobs.filter((j) => ['accepted', 'provider_assigned', 'on_the_way', 'arrived', 'in_progress', 'awaiting_quote_approval'].includes(j.status)).length,
          monthEarnings: completed.filter((j) => j.completed_at?.slice(0, 7) === monthStart).reduce((s, j) => s + (j.provider_payable || 0), 0),
          pendingSettlement: completed.filter((j) => j.payment_status === 'paid').reduce((s, j) => s + (j.provider_payable || 0), 0),
        });
        setUpcoming(
          jobs
            .filter((j) => !['completed', 'cancelled'].includes(j.status))
            .sort((a, b) => (a.scheduled_at ?? a.created_at).localeCompare(b.scheduled_at ?? b.created_at))
            .slice(0, 5),
        );
        const notifs = await getNotifications();
        setUnread(notifs.filter((n) => !n.is_read).length);
      }
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

  if (loading) {
    return (
      <View style={styles.wrap}>
        <LoadingSkeleton />
      </View>
    );
  }
  if (error && !prov) {
    return (
      <View style={styles.wrap}>
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  // No provider profile yet → direct to registration
  if (!prov) {
    return (
      <View style={styles.wrap}>
        <View style={styles.inner}>
          <EmptyState
            title="Become a GharFix provider"
            message="Complete your registration and verification to start receiving job requests."
            actionTitle="Start registration"
            onAction={() => router.push('/(provider)/register')}
          />
        </View>
      </View>
    );
  }

  const verified = prov.verification_status === 'approved';

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {prov.display_name.split(' ')[0]}</Text>
          <Text style={styles.sub}>Here's your business today</Text>
        </View>
        <Pressable onPress={() => router.push('/(provider)/notifications')} accessibilityRole="button" accessibilityLabel="Notifications">
          <Text style={styles.bell}>◉{unread > 0 ? ` (${unread})` : ''}</Text>
        </Pressable>
      </View>

      {/* Verification banner — "Verified" is shown ONLY when admin approved. */}
      <Card style={[styles.banner, verified ? styles.bannerOk : styles.bannerWarn]}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              {verified ? '✓ Verified provider' : `Verification: ${VERIFICATION_STATUS_LABELS[prov.verification_status]}`}
            </Text>
            <Text style={styles.bannerBody}>
              {verified
                ? 'You appear as verified to customers.'
                : prov.verification_status === 'rejected'
                  ? `Rejected: ${prov.verification_notes ?? 'contact support'}. You can re-register.`
                  : 'Complete verification to appear as verified and receive more jobs.'}
            </Text>
          </View>
          {!verified && prov.verification_status !== 'pending' && prov.verification_status !== 'under_review' ? (
            <Button title="Verify" onPress={() => router.push('/(provider)/register')} />
          ) : null}
        </View>
      </Card>

      <View style={styles.grid}>
        <StatCard label="New requests" value={String(stats.newRequests)} onPress={() => router.push('/(provider)/jobs')} />
        <StatCard label="Today's jobs" value={String(stats.todayCount)} onPress={() => router.push('/(provider)/jobs')} />
        <StatCard label="In progress" value={String(stats.inProgress)} onPress={() => router.push('/(provider)/jobs')} />
        <StatCard label="This month" value={formatPKR(stats.monthEarnings)} onPress={() => router.push('/(provider)/earnings')} />
      </View>

      <Card style={styles.ratingCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.ratingLabel}>Your rating</Text>
          <RatingStars rating={prov.rating_avg} showValue />
        </View>
        <Text style={styles.meta}>{prov.rating_count} reviews • {prov.completed_jobs} jobs completed</Text>
      </Card>

      <SectionHeader title="Upcoming jobs" actionTitle="See all" onAction={() => router.push('/(provider)/jobs')} />
      {upcoming.length === 0 ? (
        <EmptyState title="No upcoming jobs" message="New job requests will appear here." />
      ) : (
        upcoming.map((j) => (
          <Pressable key={j.id} onPress={() => router.push({ pathname: '/(provider)/job/[id]', params: { id: j.id } })}>
            <Card style={styles.jobCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.jobRef}>{j.reference}</Text>
                <BookingBadge status={j.status} />
              </View>
              <Text style={styles.meta} numberOfLines={2}>{j.description}</Text>
              <Text style={styles.meta}>{j.scheduled_at ? new Date(j.scheduled_at).toLocaleString('en-PK') : j.asap ? 'ASAP' : ''} • {formatPKR(j.total_estimate)}</Text>
            </Card>
          </Pressable>
        ))
      )}

      <SectionHeader title="Manage" />
      <Card>
        <MenuRow label="Availability & blocked dates" onPress={() => router.push('/(provider)/availability')} />
        <MenuRow label="Earnings & settlements" onPress={() => router.push('/(provider)/earnings')} />
        <MenuRow label="Edit profile" onPress={() => router.push('/(provider)/profile')} last />
      </Card>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.stat} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function MenuRow({ label, onPress, last = false }: { label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.menuRow, !last && styles.menuBorder]} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  inner: { padding: 16, paddingTop: 52 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  greeting: { fontSize: 22, fontWeight: '800', color: C.darkNavy },
  sub: { fontSize: 13, color: C.secondaryText, marginTop: 2 },
  bell: { fontSize: 22, color: C.darkNavy },
  banner: { marginBottom: 12, borderWidth: 1.5 },
  bannerOk: { borderColor: C.success, backgroundColor: '#D1FAE5' },
  bannerWarn: { borderColor: C.warning, backgroundColor: '#FEF3C7' },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: C.darkNavy },
  bannerBody: { fontSize: 12, color: C.secondaryText, marginTop: 4, lineHeight: 17 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  stat: { width: '48%', backgroundColor: C.pureWhite, borderRadius: 14, borderWidth: 1, borderColor: C.borderGray, padding: 14 },
  statValue: { fontSize: 20, fontWeight: '800', color: C.darkNavy },
  statLabel: { fontSize: 12, color: C.secondaryText, marginTop: 4 },
  ratingCard: { marginTop: 10 },
  ratingLabel: { fontSize: 14, fontWeight: '700', color: C.darkNavy },
  meta: { fontSize: 13, color: C.secondaryText, marginTop: 6, lineHeight: 19 },
  jobCard: { marginBottom: 10 },
  jobRef: { fontSize: 15, fontWeight: '800', color: C.darkNavy },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: C.softGray },
  menuLabel: { fontSize: 15, color: C.darkNavy, fontWeight: '500' },
  chevron: { fontSize: 20, color: C.secondaryText },
});
