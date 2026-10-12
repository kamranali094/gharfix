import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BRAND, formatPKR, type Booking, type ProviderSettlement } from '@gharfix/shared';
import { getMyProviderProfile, getProviderJobs, getProviderSettlements, errMsg } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { PriceRow } from '../../components/ui/PriceSummary';

const C = BRAND.colors;

export default function EarningsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Booking[]>([]);
  const [settlements, setSettlements] = useState<ProviderSettlement[]>([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const p = await getMyProviderProfile();
      if (!p) return;
      const [jobs, stl] = await Promise.all([getProviderJobs(p.user_id, ['completed']), getProviderSettlements(p.user_id)]);
      setCompleted(jobs);
      setSettlements(stl);
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

  const gross = completed.reduce((s, j) => s + (j.final_amount ?? j.total_estimate), 0);
  const commission = completed.reduce((s, j) => s + j.commission_amount, 0);
  const net = completed.reduce((s, j) => s + j.provider_payable, 0);

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />}
    >
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>Earnings</Text>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      ) : (
        <View>
          <SectionHeader title="Summary (completed jobs)" />
          <Card>
            <PriceRow label="Gross labour & charges" value={formatPKR(gross)} />
            <PriceRow label="Platform commission" value={`− ${formatPKR(commission)}`} />
            <View style={styles.divider} />
            <PriceRow label="Your net earnings" value={formatPKR(net)} bold />
            <Text style={styles.fine}>
              Commission is taken on labour only (materials pass through to you). Each booking stores its own
              commission snapshot, so later rate changes never rewrite history.
            </Text>
          </Card>

          <SectionHeader title="Per-booking breakdown" />
          {completed.length === 0 ? (
            <EmptyState title="No completed jobs yet" message="Earnings from completed jobs will appear here." />
          ) : (
            completed.map((j) => (
              <Pressable key={j.id} onPress={() => router.push({ pathname: '/(provider)/job/[id]', params: { id: j.id } })}>
                <Card style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.ref}>{j.reference}</Text>
                    <Badge status={j.payment_status} />
                  </View>
                  <PriceRow label="Gross" value={formatPKR(j.final_amount ?? j.total_estimate)} />
                  <PriceRow label={`Commission (${Math.round(j.commission_rate * 100)}%)`} value={`− ${formatPKR(j.commission_amount)}`} />
                  <PriceRow label="Net to you" value={formatPKR(j.provider_payable)} bold />
                </Card>
              </Pressable>
            ))
          )}

          <SectionHeader title="Settlements" />
          {settlements.length === 0 ? (
            <EmptyState title="No settlements yet" message="When the platform pays out your earnings, settlements appear here." />
          ) : (
            settlements.map((s) => (
              <Card key={s.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.ref}>{s.reference}</Text>
                  <Badge status={s.status} />
                </View>
                <Text style={styles.meta}>{s.period_start} → {s.period_end}</Text>
                <PriceRow label="Gross" value={formatPKR(s.gross_amount)} />
                <PriceRow label="Commission" value={`− ${formatPKR(s.commission_amount)}`} />
                {s.adjustments !== 0 ? <PriceRow label="Adjustments" value={formatPKR(s.adjustments)} /> : null}
                <PriceRow label="Net paid" value={formatPKR(s.net_amount)} bold />
                {s.txn_reference ? <Text style={styles.meta}>TXN: {s.txn_reference}</Text> : null}
              </Card>
            ))
          )}
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  inner: { padding: 16, paddingTop: 52 },
  back: { fontSize: 15, fontWeight: '600', color: C.primary, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: C.darkNavy, marginBottom: 4 },
  card: { marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 15, fontWeight: '800', color: C.darkNavy },
  meta: { fontSize: 12, color: C.secondaryText, marginTop: 4 },
  divider: { height: 1, backgroundColor: C.borderGray, marginVertical: 8 },
  fine: { fontSize: 11, color: C.secondaryText, marginTop: 10, lineHeight: 16 },
});
