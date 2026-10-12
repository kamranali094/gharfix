import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  BRAND,
  formatPKR,
  canCancelBooking,
  reviewSchema,
  paymentSubmitSchema,
  type BookingStatusHistory,
  type BookingQuote,
  type Payment,
  type Review,
  type PaymentMethod,
} from '@gharfix/shared';
import {
  getBooking,
  getStatusHistory,
  getQuotes,
  getPayments,
  getMyReview,
  decideQuote,
  submitPayment,
  createReview,
  cancelBooking,
  createTicket,
  errMsg,
  type BookingDetail,
  type PickedImage,
} from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { BookingBadge, Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/TextInput';
import { PriceSummary, PriceRow } from '../../../components/ui/PriceSummary';
import { RatingStars } from '../../../components/ui/RatingStars';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

const C = BRAND.colors;

const PAYMENT_METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'cash', label: 'Cash', hint: 'Pay in cash when the work is done.' },
  { value: 'easypaisa_manual', label: 'Easypaisa (manual)', hint: 'Transfer manually; an admin verifies your transaction.' },
  { value: 'jazzcash_manual', label: 'JazzCash (manual)', hint: 'Transfer manually; an admin verifies your transaction.' },
];

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [history, setHistory] = useState<BookingStatusHistory[]>([]);
  const [quotes, setQuotes] = useState<BookingQuote[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [review, setReview] = useState<Review | null>(null);

  // action state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [quoteNote, setQuoteNote] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showPay, setShowPay] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [txnRef, setTxnRef] = useState('');
  const [proof, setProof] = useState<PickedImage | null>(null);
  const [showComplaint, setShowComplaint] = useState(false);
  const [complaint, setComplaint] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const [b, h, q, p, r] = await Promise.all([
        getBooking(id),
        getStatusHistory(id),
        getQuotes(id),
        getPayments(id),
        getMyReview(id),
      ]);
      setBooking(b);
      setHistory(h);
      setQuotes(q);
      setPayments(p);
      setReview(r);
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

  const doCancel = async () => {
    if (!booking) return;
    if (!cancelReason.trim()) return;
    setBusy(true);
    try {
      const updated = await cancelBooking(booking, 'customer', cancelReason.trim());
      setBooking({ ...booking, ...updated });
      setCancelOpen(false);
      setCancelReason('');
      load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const doDecideQuote = async (quote: BookingQuote, approve: boolean) => {
    if (!booking) return;
    setBusy(true);
    try {
      await decideQuote(booking, quote, approve, quoteNote || undefined);
      setQuoteNote('');
      load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const doPay = async () => {
    if (!booking) return;
    const parsed = paymentSubmitSchema.safeParse({ booking_id: booking.id, method: payMethod, txn_reference: txnRef || null });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid payment');
      return;
    }
    if (payMethod !== 'cash' && !txnRef.trim() && !proof) {
      setError('Enter the transaction reference (TID) or attach proof of transfer.');
      return;
    }
    setBusy(true);
    try {
      await submitPayment(booking, payMethod, txnRef.trim() || null, proof);
      setShowPay(false);
      setTxnRef('');
      setProof(null);
      load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const doReview = async () => {
    if (!booking) return;
    const parsed = reviewSchema.safeParse({ booking_id: booking.id, rating, comment: comment || null, photos: [] });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid review');
      return;
    }
    setBusy(true);
    try {
      const r = await createReview(parsed.data);
      setReview(r);
      setShowReviewForm(false);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const doComplaint = async () => {
    if (!booking || complaint.trim().length < 10) {
      setError('Please describe the problem (min 10 characters).');
      return;
    }
    setBusy(true);
    try {
      await createTicket({ bookingId: booking.id, category: 'booking_complaint', priority: 'high', description: complaint.trim() });
      setShowComplaint(false);
      setComplaint('');
      load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const pickProof = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    setProof({ uri: a.uri, mime: a.mimeType ?? 'image/jpeg', bytes: a.fileSize ?? 0 });
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
  if (!booking) {
    return (
      <View style={styles.wrap}>
        <EmptyState title="Booking not found" />
      </View>
    );
  }

  const pendingQuote = quotes.find((q) => q.status === 'pending');
  const canCancel = canCancelBooking(booking.status);
  const showPaySection = booking.status === 'completed' && booking.payment_status === 'unpaid';

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

      <SectionHeader title="Details" />
      <Card>
        <PriceRow label="Service" value={booking.service?.name ?? booking.category?.name ?? '—'} />
        <PriceRow label="Provider" value={booking.provider?.display_name ?? 'Not assigned yet'} />
        <PriceRow label="Address" value={booking.address ? `${booking.address.house}, ${booking.address.street}, ${booking.address.area}, ${booking.address.city}` : '—'} />
        <PriceRow label="Schedule" value={booking.asap ? 'ASAP' : booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString('en-PK') : '—'} />
        <PriceRow label="Payment" value={booking.payment_status.replace(/_/g, ' ')} />
      </Card>

      <SectionHeader title="Price" />
      <Card>
        <PriceSummary snapshot={booking.price_snapshot} />
        {booking.final_amount != null ? <PriceRow label="Final amount" value={formatPKR(booking.final_amount)} bold /> : null}
      </Card>

      {/* Quote approval */}
      {booking.status === 'awaiting_quote_approval' && pendingQuote ? (
        <View>
          <SectionHeader title={`Quote v${pendingQuote.version} — awaiting your approval`} />
          <Card>
            {pendingQuote.items.map((it, i) => (
              <PriceRow key={i} label={`${it.label} × ${it.quantity}`} value={formatPKR(it.amount)} />
            ))}
            <PriceRow label="Quote total" value={formatPKR(pendingQuote.subtotal)} bold />
            <TextInput label="Note (optional)" value={quoteNote} onChangeText={setQuoteNote} placeholder="e.g. Approved, please proceed" />
            <View style={styles.quoteActions}>
              <Button title="Reject" onPress={() => doDecideQuote(pendingQuote, false)} variant="danger" loading={busy} style={styles.quoteBtn} />
              <Button title="Approve quote" onPress={() => doDecideQuote(pendingQuote, true)} loading={busy} style={styles.quoteBtn} />
            </View>
            <Text style={styles.fine}>A rejected quote can never silently become approved — the provider must submit a new version.</Text>
          </Card>
        </View>
      ) : null}

      {/* Payment */}
      <SectionHeader title="Payment" />
      <Card>
        {payments.length === 0 ? (
          <Text style={styles.meta}>No payments recorded yet.</Text>
        ) : (
          payments.map((p) => (
            <View key={p.id} style={styles.payRow}>
              <View>
                <Text style={styles.payRef}>{p.reference} • {p.method.replace(/_/g, ' ')}</Text>
                <Text style={styles.meta}>{formatPKR(p.amount)}{p.txn_reference ? ` • TID ${p.txn_reference}` : ''}</Text>
              </View>
              <Badge status={p.status} />
            </View>
          ))
        )}
        {showPaySection ? (
          <View style={styles.mt}>
            {!showPay ? (
              <Button title="Pay now" onPress={() => setShowPay(true)} />
            ) : (
              <View>
                {PAYMENT_METHODS.map((m) => (
                  <Pressable key={m.value} onPress={() => setPayMethod(m.value)} style={[styles.method, payMethod === m.value && styles.methodActive]} accessibilityRole="radio" accessibilityState={{ selected: payMethod === m.value }}>
                    <Text style={styles.methodTitle}>{m.label}</Text>
                    <Text style={styles.meta}>{m.hint}</Text>
                  </Pressable>
                ))}
                {payMethod !== 'cash' ? (
                  <View>
                    <TextInput label="Transaction reference (TID)" value={txnRef} onChangeText={setTxnRef} placeholder="e.g. 34567890123" />
                    <Button title={proof ? '✓ Proof attached' : 'Attach transfer proof'} onPress={pickProof} variant="secondary" />
                    <Text style={styles.fine}>Manual transfers are marked “pending verification” until an admin verifies them — never as successful.</Text>
                  </View>
                ) : null}
                <Button title="Submit payment" onPress={doPay} loading={busy} style={styles.mt} />
              </View>
            )}
          </View>
        ) : null}
      </Card>

      {/* Timeline */}
      <SectionHeader title="Timeline" />
      <Card>
        {history.length === 0 ? (
          <Text style={styles.meta}>No updates yet.</Text>
        ) : (
          history.map((h) => (
            <View key={h.id} style={styles.tlRow}>
              <View style={styles.tlDot} />
              <View style={styles.tlBody}>
                <Text style={styles.tlTitle}>
                  {h.from_status ? `${h.from_status.replace(/_/g, ' ')} → ` : ''}{h.to_status.replace(/_/g, ' ')}
                </Text>
                {h.note ? <Text style={styles.meta}>{h.note}</Text> : null}
                <Text style={styles.tlTime}>{new Date(h.created_at).toLocaleString('en-PK')} • {h.actor_role}</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Review */}
      {booking.status === 'completed' ? (
        <View>
          <SectionHeader title="Review" />
          <Card>
            {review ? (
              <View>
                <RatingStars rating={review.rating} showValue />
                {review.comment ? <Text style={styles.desc}>{review.comment}</Text> : null}
              </View>
            ) : showReviewForm ? (
              <View>
                <Text style={styles.label}>Your rating</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Pressable key={s} onPress={() => setRating(s)} accessibilityRole="button" accessibilityLabel={`${s} stars`}>
                      <Text style={[styles.star, s <= rating && styles.starOn]}>★</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput label="Comment (optional)" value={comment} onChangeText={setComment} multiline numberOfLines={3} placeholder="How was the service?" />
                <Button title="Submit review" onPress={doReview} loading={busy} />
              </View>
            ) : (
              <Button title="Write a review" onPress={() => setShowReviewForm(true)} variant="secondary" />
            )}
          </Card>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        {canCancel && !cancelOpen ? (
          <Button title="Cancel booking" onPress={() => setCancelOpen(true)} variant="secondary" />
        ) : null}
        {cancelOpen ? (
          <Card>
            <Text style={styles.label}>Why are you cancelling?</Text>
            <TextInput label="Cancellation reason" value={cancelReason} onChangeText={setCancelReason} placeholder="e.g. Provider never arrived" />
            <View style={styles.quoteActions}>
              <Button title="Keep booking" onPress={() => setCancelOpen(false)} variant="secondary" style={styles.quoteBtn} />
              <Button title="Yes, cancel" onPress={doCancel} variant="danger" loading={busy} style={styles.quoteBtn} />
            </View>
          </Card>
        ) : null}
        <Button title={showComplaint ? 'Close' : 'Report a problem'} onPress={() => setShowComplaint(!showComplaint)} variant="ghost" />
      </View>
      {showComplaint ? (
        <Card style={styles.mt}>
          <TextInput label="Describe the problem" value={complaint} onChangeText={setComplaint} multiline numberOfLines={4} placeholder="What went wrong with this booking?" />
          <Button title="Submit complaint" onPress={doComplaint} loading={busy} variant="danger" />
        </Card>
      ) : null}
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
  quoteActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quoteBtn: { flex: 1 },
  fine: { fontSize: 11, color: C.secondaryText, marginTop: 10, lineHeight: 16 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.softGray },
  payRef: { fontSize: 13, fontWeight: '700', color: C.darkNavy },
  method: { borderWidth: 1.5, borderColor: C.borderGray, borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: C.pureWhite },
  methodActive: { borderColor: C.primary, backgroundColor: C.lightGreen },
  methodTitle: { fontSize: 14, fontWeight: '700', color: C.darkNavy },
  tlRow: { flexDirection: 'row', marginBottom: 14 },
  tlDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, marginTop: 4, marginRight: 10 },
  tlBody: { flex: 1 },
  tlTitle: { fontSize: 14, fontWeight: '700', color: C.darkNavy, textTransform: 'capitalize' },
  tlTime: { fontSize: 11, color: C.secondaryText, marginTop: 2 },
  label: { fontSize: 14, fontWeight: '600', color: C.darkNavy, marginBottom: 8 },
  stars: { flexDirection: 'row', marginBottom: 8 },
  star: { fontSize: 36, color: C.borderGray, marginRight: 6 },
  starOn: { color: '#F59E0B' },
  actions: { marginTop: 18, gap: 4 },
});
