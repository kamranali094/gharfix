import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BRAND, ticketCreateSchema, type SupportTicket, type TicketPriority } from '@gharfix/shared';
import { createTicket, getMyTickets, errMsg } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { Badge } from '../../components/ui/Badge';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

const C = BRAND.colors;

const FAQ = [
  { q: 'How do I book a service?', a: 'Search for a service or provider, describe the problem, pick an address and time slot, review the price, and confirm. You get a booking reference instantly.' },
  { q: 'How does quotation-based pricing work?', a: 'For some services the final price depends on inspection. The provider submits an itemized quote, and no chargeable work starts until you approve it.' },
  { q: 'How do I pay?', a: 'Pay cash on completion, or transfer via Easypaisa/JazzCash and submit the transaction reference. Manual transfers are verified by our team before being marked paid.' },
  { q: 'Can I cancel a booking?', a: 'Yes, from the booking details page while the booking is not completed. Cancellation follows the platform cancellation policy.' },
  { q: 'Are providers verified?', a: 'Providers showing a Verified badge have passed document verification by our team. Never trust a provider shown as unverified.' },
];

const CATEGORIES = ['general', 'booking_issue', 'payment_issue', 'provider_complaint', 'app_feedback'];
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

export default function SupportScreen() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setTickets(await getMyTickets());
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

  const submit = async () => {
    setFormError(null);
    const parsed = ticketCreateSchema.safeParse({ booking_id: null, category, priority, description });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Invalid ticket');
      return;
    }
    setSaving(true);
    try {
      const t = await createTicket({ category, priority, description: description.trim() });
      setTickets((x) => [t, ...x]);
      setShowForm(false);
      setDescription('');
    } catch (e) {
      setFormError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>Help Center</Text>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.inner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />}
      >
        <SectionHeader title="Frequently asked questions" />
        {FAQ.map((f, i) => (
          <Card key={i} style={styles.faq}>
            <Text style={styles.faqQ}>{f.q}</Text>
            <Text style={styles.faqA}>{f.a}</Text>
          </Card>
        ))}

        <SectionHeader title="Contact support" actionTitle={showForm ? 'Close' : 'New ticket'} onAction={() => setShowForm(!showForm)} />
        {showForm ? (
          <Card style={styles.form}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c.replace(/_/g, ' ')}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.chips}>
              {PRIORITIES.map((p) => (
                <Pressable key={p} onPress={() => setPriority(p)} style={[styles.chip, priority === p && styles.chipActive]}>
                  <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>{p}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput label="Describe your issue" value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholder="Tell us what happened…" error={formError} />
            <Button title="Submit ticket" onPress={submit} loading={saving} />
          </Card>
        ) : null}

        <SectionHeader title="My tickets" />
        {loading ? (
          <LoadingSkeleton count={2} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
        ) : tickets.length === 0 ? (
          <EmptyState title="No tickets yet" message="Your support tickets and their status will appear here." />
        ) : (
          tickets.map((t) => (
            <Card key={t.id} style={styles.ticket}>
              <View style={styles.rowBetween}>
                <Text style={styles.ticketRef}>{t.reference}</Text>
                <Badge status={t.status} />
              </View>
              <Text style={styles.meta}>{t.category.replace(/_/g, ' ')} • {t.priority}</Text>
              <Text style={styles.ticketDesc} numberOfLines={3}>{t.description}</Text>
              {t.resolution_notes ? <Text style={styles.resolution}>Resolution: {t.resolution_notes}</Text> : null}
              <Text style={styles.meta}>{new Date(t.created_at).toLocaleString('en-PK')}</Text>
            </Card>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite, paddingTop: 52 },
  back: { fontSize: 15, fontWeight: '600', color: C.primary, paddingHorizontal: 16, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: C.darkNavy, paddingHorizontal: 16, marginBottom: 4 },
  list: { flex: 1 },
  inner: { padding: 16, paddingTop: 0 },
  faq: { marginBottom: 8 },
  faqQ: { fontSize: 14, fontWeight: '700', color: C.darkNavy },
  faqA: { fontSize: 13, color: C.secondaryText, marginTop: 6, lineHeight: 19 },
  form: { marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: C.darkNavy, marginTop: 10, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: C.borderGray, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.pureWhite },
  chipActive: { borderColor: C.primary, backgroundColor: C.lightGreen },
  chipText: { fontSize: 12, fontWeight: '600', color: C.secondaryText, textTransform: 'capitalize' },
  chipTextActive: { color: C.deepGreen },
  ticket: { marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketRef: { fontSize: 14, fontWeight: '800', color: C.darkNavy },
  ticketDesc: { fontSize: 13, color: C.darkNavy, marginTop: 6, lineHeight: 19 },
  meta: { fontSize: 12, color: C.secondaryText, marginTop: 4 },
  resolution: { fontSize: 13, color: C.success, marginTop: 8, lineHeight: 19, fontWeight: '600' },
});
