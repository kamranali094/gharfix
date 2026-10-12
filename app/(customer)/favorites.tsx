import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BRAND, formatPKR } from '@gharfix/shared';
import { getFavorites, toggleFavorite, errMsg, type ProviderCard } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { RatingStars } from '../../components/ui/RatingStars';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const C = BRAND.colors;

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<ProviderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setFavorites(await getFavorites());
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

  const doRemove = async () => {
    if (!removeId) return;
    setBusy(true);
    try {
      await toggleFavorite(removeId);
      setFavorites((f) => f.filter((x) => x.profile.user_id !== removeId));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
      setRemoveId(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Favorites</Text>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.inner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
        ) : favorites.length === 0 ? (
          <EmptyState
            title="No favorites yet"
            message="Tap the heart on any provider's profile to save them here for quick rebooking."
            actionTitle="Find providers"
            onAction={() => router.push('/(customer)/search')}
          />
        ) : (
          favorites.map((p) => (
            <Pressable
              key={p.profile.user_id}
              onPress={() => router.push({ pathname: '/(customer)/provider/[id]', params: { id: p.profile.user_id } })}
            >
              <Card style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.name}>{p.profile.display_name}</Text>
                  <Pressable onPress={() => setRemoveId(p.profile.user_id)} accessibilityRole="button" accessibilityLabel="Remove from favorites">
                    <Text style={styles.heart}>♥</Text>
                  </Pressable>
                </View>
                <View style={styles.rowBetween}>
                  <RatingStars rating={p.profile.rating_avg} showValue />
                  {p.profile.verification_status === 'approved' ? <Badge status="verified" /> : null}
                </View>
                <Text style={styles.meta}>
                  {p.startingPrice != null ? `from ${formatPKR(p.startingPrice)}` : 'Quote-based'} • {p.profile.city}
                </Text>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
      <ConfirmDialog
        visible={!!removeId}
        title="Remove favorite?"
        message="This provider will be removed from your favorites."
        confirmTitle="Remove"
        destructive
        loading={busy}
        onConfirm={doRemove}
        onCancel={() => setRemoveId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite, paddingTop: 52 },
  title: { fontSize: 24, fontWeight: '800', color: C.darkNavy, paddingHorizontal: 16, marginBottom: 12 },
  list: { flex: 1 },
  inner: { padding: 16, paddingTop: 0 },
  card: { marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: C.darkNavy, flex: 1, marginRight: 8 },
  heart: { fontSize: 24, color: C.error },
  meta: { fontSize: 13, color: C.secondaryText, marginTop: 6 },
});
