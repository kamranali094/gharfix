import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { BRAND, formatPKR, VERIFICATION_STATUS_LABELS } from '@gharfix/shared';
import { getProviderDetail, isFavorite, toggleFavorite, createTicket, errMsg } from '../../../lib/api';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Card } from '../../../components/ui/Card';
import { RatingStars } from '../../../components/ui/RatingStars';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

const C = BRAND.colors;

export default function ProviderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getProviderDetail>> | null>(null);
  const [fav, setFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [d, f] = await Promise.all([getProviderDetail(id), isFavorite(id)]);
      setDetail(d);
      setFav(f);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onToggleFav = async () => {
    setFavBusy(true);
    try {
      setFav(await toggleFavorite(id));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setFavBusy(false);
    }
  };

  const onReport = async () => {
    setReportBusy(true);
    try {
      await createTicket({
        category: 'report_profile',
        priority: 'medium',
        description: `Customer report against provider ${detail?.profile.display_name} (provider_id=${id}). Please review.`,
      });
      setReportDone(true);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setReportBusy(false);
      setReportOpen(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.wrap}>
        <LoadingSkeleton />
      </View>
    );
  }
  if (error || !detail) {
    return (
      <View style={styles.wrap}>
        <ErrorState message={error ?? 'Provider not found.'} onRetry={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  const p = detail.profile;
  const verified = p.verification_status === 'approved';

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.inner}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{p.display_name}</Text>
          <Pressable onPress={onToggleFav} disabled={favBusy} accessibilityRole="button" accessibilityLabel={fav ? 'Remove from favorites' : 'Save to favorites'}>
            <Text style={[styles.heart, fav && styles.heartActive]}>{fav ? '♥' : '♡'}</Text>
          </Pressable>
        </View>
        {/* Verified badge ONLY when an admin approved verification — never otherwise. */}
        <View style={styles.badgeRow}>
          {verified ? (
            <Badge status="verified" />
          ) : (
            <Text style={styles.unverified}>Verification: {VERIFICATION_STATUS_LABELS[p.verification_status]}</Text>
          )}
        </View>
        {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}
        <View style={styles.metaRow}>
          <RatingStars rating={p.rating_avg} showValue />
          <Text style={styles.meta}>({p.rating_count} reviews)</Text>
        </View>
        <Text style={styles.meta}>📍 {p.city || '—'}{p.experience_years != null ? ` • ${p.experience_years} yrs experience` : ''}</Text>
        <Text style={styles.meta}>✅ {p.completed_jobs} jobs completed</Text>
        <Pressable onPress={() => setReportOpen(true)} accessibilityRole="button" accessibilityLabel="Report profile">
          <Text style={styles.report}>{reportDone ? '✓ Report submitted — thank you' : 'Report profile'}</Text>
        </Pressable>
      </Card>
      <ConfirmDialog
        visible={reportOpen}
        title="Report this profile?"
        message="Our support team will review this provider's profile. This creates a support ticket linked to your account."
        confirmTitle="Report"
        onConfirm={onReport}
        onCancel={() => setReportOpen(false)}
        loading={reportBusy}
      />

      <SectionHeader title="Services & pricing" />
      {detail.services.length === 0 ? (
        <EmptyState title="No services listed" />
      ) : (
        detail.services.map((s) => (
          <Card key={s.id} style={styles.serviceCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.serviceName}>{s.name}</Text>
              <Text style={styles.price}>
                {s.pricing_model === 'quotation'
                  ? 'Quote-based'
                  : formatPKR(s.custom_price ?? s.base_price)}
              </Text>
            </View>
            <Button
              title="Book Now"
              onPress={() => router.push({ pathname: '/(customer)/book/[serviceId]', params: { serviceId: s.id, providerId: p.user_id } })}
              style={styles.bookBtn}
            />
          </Card>
        ))
      )}

      <SectionHeader title={`Reviews (${detail.reviews.length})`} />
      {detail.reviews.length === 0 ? (
        <EmptyState title="No reviews yet" message="Be the first to book and review this provider." />
      ) : (
        detail.reviews.map((r) => (
          <Card key={r.id} style={styles.reviewCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.reviewer}>{r.customer_name ?? 'Customer'}</Text>
              <RatingStars rating={r.rating} size={13} />
            </View>
            {r.comment ? <Text style={styles.comment}>{r.comment}</Text> : null}
            <Text style={styles.date}>{new Date(r.created_at).toLocaleDateString('en-PK')}</Text>
          </Card>
        ))
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  inner: { padding: 16, paddingTop: 52 },
  back: { fontSize: 15, fontWeight: '600', color: C.primary, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '800', color: C.darkNavy, flex: 1, marginRight: 8 },
  heart: { fontSize: 30, color: C.borderGray },
  heartActive: { color: C.error },
  badgeRow: { marginTop: 8 },
  unverified: { fontSize: 12, color: C.secondaryText, fontStyle: 'italic' },
  bio: { fontSize: 14, color: C.darkNavy, marginTop: 10, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  meta: { fontSize: 13, color: C.secondaryText, marginTop: 6 },
  report: { fontSize: 13, color: C.error, marginTop: 12, fontWeight: '600' },
  serviceCard: { marginBottom: 10 },
  serviceName: { fontSize: 15, fontWeight: '700', color: C.darkNavy, flex: 1, marginRight: 8 },
  price: { fontSize: 14, fontWeight: '700', color: C.primary },
  bookBtn: { marginTop: 10 },
  reviewCard: { marginBottom: 10 },
  reviewer: { fontSize: 14, fontWeight: '700', color: C.darkNavy },
  comment: { fontSize: 13, color: C.darkNavy, marginTop: 6, lineHeight: 19 },
  date: { fontSize: 11, color: C.secondaryText, marginTop: 6 },
});
