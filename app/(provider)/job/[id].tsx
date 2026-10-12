import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  BRAND,
  formatPKR,
  maskPhone,
  canTransitionBooking,
  quoteSubmitSchema,
  type BookingStatus,
  type BookingStatusHistory,
  type BookingQuote,
  type BookingQuoteItem,
} from '@gharfix/shared';
import {
  getBooking,
  getStatusHistory,
  getQuotes,
  transitionBooking,
  submitQuote,
  errMsg,
  type BookingDetail,
} from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { BookingBadge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/TextInput';
import { PriceSummary, PriceRow } from '../../../components/ui/PriceSummary';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';

const C = BRAND.colors;

/** Provider-side action buttons, each gated by the shared state machine. */
const ACTIONS: { to: BookingStatus; title: string; note: string; confirm?: string }[] = [
  { to: 'accepted', title: 'Accept job', note: 'Accept this booking request' },
  { to: 'on_the_way', title: "I'm on the way", note: 'Head to the customer' },
  { to: 'arrived', title: "I've arrived", note: 'Arrived at location' },
  { to: 'in_progress', title: 'Start work', note: 'Work started' },
  { to: 'completed', title: 'Complete job', note: 'Work completed', confirm: 'Mark this job as completed? Only complete work that is actually done.' },
  { to: 'cancelled', title: 'Cancel job', note: 'Cancelled by provider', confirm: 'Cancel this job? This notifies the customer.' },
];

export default function ProviderJobDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [history, setHistory] = useState<BookingStatusHistory[]>([]);
  const [quotes, setQuotes] = useState<BookingQuote[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(typeof ACTIONS)[number] | null>(null);

  // quote form
  const [showQuote, setShowQuote] = useState(false);
  const [items, setItems] = useState<BookingQuoteItem[]>([{ label: '', quantity: 1, unit_price: 0, amount: 0 }]);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [b, h, q] = await Promise.all([getBooking(id), getStatusHistory(id), getQuotes(id)]);
      setBooking(b);
      setHistory(h);
      setQuotes(q);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const runTransition = async (to: BookingStatus, note?: string) => {
    if (!booking) return;
    setBusy(true);
    try {
      const updated = await transitionBooking(booking, to, 'provider', note);
      setBooking({ ...booking, ...updated });
      load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  };

  const doSubmitQuote = async () => {
    if (!booking) return;
    setQuoteError(null);
    const parsed = quoteSubmitSchema.safeParse({
      booking_id: booking.id,
      items: items.map((i) => ({ label: i.label, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
    });
    if (!parsed.success) {
      setQuoteError(parsed.error.issues[0]?.message ?? 'Invalid quote');
      return;
    }
    setBusy(true);
    try {
      await submitQuote(booking, parsed.data);
      setShowQuote(false);
      setItems([{ label: '', quantity: 1, unit_price: 0, amount: 0 }]);
      load();
    } catch (e) {
      setQuoteError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.wrap}>
        <LoadingSkeleton />
      </View>
    );
  }
  if (error && !booking) {
    return (
      <View style={styles.wrap}>
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      </View>
    );
  }
  if (!booking) return null;

  const allowed = ACTIONS.filter((a) => canTransitionBooking(booking.status, a.to, 'provider'));
  const canQuote = canTransitionBooking(booking.status, 'awaiting_quote_approval', 'provider');

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />}
    >
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <View style={styles.rowBetween}>
        <Text style={styles.ref}>{booking.reference}</Text>
        <BookingBadge status={booking.status} />
      </View>
      <Text style={styles.desc}>{booking.description}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SectionHeader title="Job details" />
      <Card>
        <PriceRow label="Customer" value={booking.customer?.full_name ?? '—'} />
        <PriceRow
          label="Phone"
          value={
            booking.customer?.phone
              ? booking.status === 'pending'
                ? `${maskPhone(booking.customer.phone)} (shared on acceptance)`
                : booking.customer.phone
              : '—'
          }
        />
        <PriceRow label="Address" value={booking.address ? `${booking.address.house}, ${booking.address.street}, ${booking.address.area}, ${booking.address.city}` : '—'} />
        <PriceRow label="Schedule" value={booking.asap ? 'ASAP' : booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString('en-PK') : '—'} />
        <PriceRow label="Urgency" value={booking.urgency} />
        <PriceRow label="Your net (est.)" value={formatPKR(booking.provider_payable)} bold />
      </Card>

      <SectionHeader title="Actions" />
      <Card>
        {allowed.length === 0 && !canQuote ? (
          <Text style={styles.meta}>No actions available in the current state.</Text>
        ) : (
          <View style={styles.actionList}>
            {allowed.map((a) => (
              <Button
                key={a.to}
                title={a.title}
                onPress={() => (a.confirm ? setConfirmAction(a) : runTransition(a.to, a.note))}
                loading={busy}
                variant={a.to === 'cancelled' ? 'danger' : 'primary'}
              />
            ))}
            {canQuote && !showQuote ? (
              <Button title="Submit quotation" onPress={() => setShowQuote(true)} variant="secondary" />
            ) : null}
          </View>
        )}
      </Card>

      {showQuote ? (
        <Card style={styles.mt}>
          <Text style={styles.label}>Itemized quotation</Text>
          {items.map((it, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={styles.itemMain}>
                <TextInput label={`Item ${i + 1}`} value={it.label} onChangeText={(t) => setItems((x) => x.map((y, j) => (j === i ? { ...y, label: t } : y)))} placeholder="e.g. Compressor gas refill" />
                <View style={styles.itemNums}>
                  <TextInput label="Qty" value={String(it.quantity)} onChangeText={(t) => setItems((x) => x.map((y, j) => (j === i ? { ...y, quantity: Number(t.replace(/[^0-9]/g, '')) || 0 } : y)))} keyboardType="number-pad" containerStyle={styles.num} />
                  <TextInput label="Unit price" value={String(it.unit_price)} onChangeText={(t) => setItems((x) => x.map((y, j) => (j === i ? { ...y, unit_price: Number(t.replace(/[^0-9]/g, '')) || 0 } : y)))} keyboardType="number-pad" containerStyle={styles.num} />
                </View>
              </View>
              {items.length > 1 ? (
                <Pressable onPress={() => setItems((x) => x.filter((_, j) => j !== i))} accessibilityLabel="Remove item">
                  <Text style={styles.remove}>✕</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          <Button title="+ Add item" onPress={() => setItems((x) => [...x, { label: '', quantity: 1, unit_price: 0, amount: 0 }])} variant="secondary" />
          <Text style={styles.total}>Total: {formatPKR(items.reduce((s, i) => s + i.quantity * i.unit_price, 0))}</Text>
          {quoteError ? <Text style={styles.error}>{quoteError}</Text> : null}
          <View style={styles.quoteBtns}>
            <Button title="Cancel" onPress={() => setShowQuote(false)} variant="ghost" style={styles.half} />
            <Button title="Submit quote" onPress={doSubmitQuote} loading={busy} style={styles.half} />
          </View>
          <Text style={styles.fine}>The customer must approve this quote before chargeable work continues. A rejected quote can never silently become approved.</Text>
        </Card>
      ) : null}

      {quotes.length > 0 ? (
        <View>
          <SectionHeader title="Quotes" />
          {quotes.map((q) => (
            <Card key={q.id} style={styles.quoteCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.quoteTitle}>Quote v{q.version}</Text>
                <Text style={[styles.quoteStatus, q.status === 'approved' ? styles.ok : q.status === 'rejected' ? styles.bad : null]}>{q.status}</Text>
              </View>
              {q.items.map((it, i) => (
                <PriceRow key={i} label={`${it.label} × ${it.quantity}`} value={formatPKR(it.amount)} />
              ))}
              <PriceRow label="Total" value={formatPKR(q.subtotal)} bold />
            </Card>
          ))}
        </View>
      ) : null}

      <SectionHeader title="Timeline" />
      <Card>
        {history.map((h) => (
          <View key={h.id} style={styles.tlRow}>
            <View style={styles.tlDot} />
            <View style={styles.tlBody}>
              <Text style={styles.tlTitle}>{h.from_status ? `${h.from_status.replace(/_/g, ' ')} → ` : ''}{h.to_status.replace(/_/g, ' ')}</Text>
              {h.note ? <Text style={styles.meta}>{h.note}</Text> : null}
              <Text style={styles.tlTime}>{new Date(h.created_at).toLocaleString('en-PK')} • {h.actor_role}</Text>
            </View>
          </View>
        ))}
      </Card>

      <ConfirmDialog
        visible={!!confirmAction}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.confirm ?? ''}
        confirmTitle="Confirm"
        destructive={confirmAction?.to === 'cancelled'}
        loading={busy}
        onConfirm={() => confirmAction && runTransition(confirmAction.to, confirmAction.note)}
        onCancel={() => setConfirmAction(null)}
      />
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  inner: { padding: 16, paddingTop: 52 },
  back: { fontSize: 15, fontWeight: '600', color: C.primary, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 22, fontWeight: '800', color: C.darkNavy },
  desc: { fontSize: 14, color: C.darkNavy, marginTop: 8, lineHeight: 21 },
  meta: { fontSize: 13, color: C.secondaryText, lineHeight: 19 },
  mt: { marginTop: 12 },
  error: { fontSize: 13, color: C.error, marginTop: 8, lineHeight: 19 },
  actionList: { gap: 10 },
  label: { fontSize: 15, fontWeight: '700', color: C.darkNavy, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemMain: { flex: 1 },
  itemNums: { flexDirection: 'row', gap: 8 },
  num: { flex: 1 },
  remove: { fontSize: 18, color: C.error, marginTop: 40 },
  total: { fontSize: 15, fontWeight: '800', color: C.darkNavy, marginVertical: 10 },
  quoteBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  half: { flex: 1 },
  fine: { fontSize: 11, color: C.secondaryText, marginTop: 10, lineHeight: 16 },
  quoteCard: { marginBottom: 10 },
  quoteTitle: { fontSize: 14, fontWeight: '800', color: C.darkNavy },
  quoteStatus: { fontSize: 12, fontWeight: '700', color: C.warning, textTransform: 'capitalize' },
  ok: { color: C.success },
  bad: { color: C.error },
  tlRow: { flexDirection: 'row', marginBottom: 14 },
  tlDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, marginTop: 4, marginRight: 10 },
  tlBody: { flex: 1 },
  tlTitle: { fontSize: 14, fontWeight: '700', color: C.darkNavy, textTransform: 'capitalize' },
  tlTime: { fontSize: 11, color: C.secondaryText, marginTop: 2 },
});
