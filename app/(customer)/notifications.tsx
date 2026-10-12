import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BRAND, type AppNotification } from '@gharfix/shared';
import { getNotifications, markNotificationRead, markAllNotificationsRead, errMsg } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

const C = BRAND.colors;

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await getNotifications());
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

  const open = async (n: AppNotification) => {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id);
        setItems((x) => x.map((i) => (i.id === n.id ? { ...i, is_read: true } : i)));
      } catch {
        /* ignore */
      }
    }
    const bookingId = (n.data as { booking_id?: string } | null)?.booking_id;
    if (bookingId) {
      router.push({ pathname: '/(customer)/booking/[id]', params: { id: bookingId } });
    }
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((x) => x.map((i) => ({ ...i, is_read: true })));
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const unread = items.filter((i) => !i.is_read).length;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        {unread > 0 ? (
          <Pressable onPress={markAll} accessibilityRole="button" accessibilityLabel="Mark all as read">
            <Text style={styles.markAll}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title}>Notifications{unread > 0 ? ` (${unread})` : ''}</Text>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.inner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
        ) : items.length === 0 ? (
          <EmptyState title="No notifications" message="Booking updates, quote decisions and payment results will appear here." />
        ) : (
          items.map((n) => (
            <Pressable key={n.id} onPress={() => open(n)}>
              <Card style={[styles.card, !n.is_read && styles.unread]}>
                <View style={styles.rowBetween}>
                  <Text style={styles.nTitle}>{n.title}</Text>
                  {!n.is_read ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.nBody}>{n.body}</Text>
                <Text style={styles.nTime}>{new Date(n.created_at).toLocaleString('en-PK')}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  back: { fontSize: 15, fontWeight: '600', color: C.primary },
  markAll: { fontSize: 14, fontWeight: '600', color: C.primary },
  title: { fontSize: 24, fontWeight: '800', color: C.darkNavy, paddingHorizontal: 16, marginBottom: 12 },
  list: { flex: 1 },
  inner: { padding: 16, paddingTop: 0 },
  card: { marginBottom: 10 },
  unread: { borderColor: C.primary, borderWidth: 1.5 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nTitle: { fontSize: 15, fontWeight: '700', color: C.darkNavy, flex: 1, marginRight: 8 },
  nBody: { fontSize: 13, color: C.secondaryText, marginTop: 4, lineHeight: 19 },
  nTime: { fontSize: 11, color: C.secondaryText, marginTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
});
