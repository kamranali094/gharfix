import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BRAND, addressSchema, type CustomerAddress } from '@gharfix/shared';
import { getAddresses, createAddress, deleteAddress, errMsg } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const C = BRAND.colors;

export default function AddressesScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ label: 'home' | 'work' | 'other'; house: string; street: string; area: string; city: string; directions: string }>({ label: 'home', house: '', street: '', area: '', city: '', directions: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setAddresses(await getAddresses());
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

  const save = async () => {
    setFormError(null);
    const parsed = addressSchema.safeParse({ ...form, is_default: addresses.length === 0 });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Invalid address');
      return;
    }
    setSaving(true);
    try {
      const created = await createAddress(parsed.data);
      setAddresses((a) => [created, ...a]);
      setShowForm(false);
      setForm({ label: 'home', house: '', street: '', area: '', city: '', directions: '' });
    } catch (e) {
      setFormError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAddress(deleteId);
      setAddresses((a) => a.filter((x) => x.id !== deleteId));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>My Addresses</Text>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.inner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
        ) : (
          <View>
            {addresses.length === 0 && !showForm ? (
              <EmptyState title="No addresses saved" message="Add your home or work address to book faster." />
            ) : null}
            {addresses.map((a) => (
              <Card key={a.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>{a.label.toUpperCase()}{a.is_default ? ' • Default' : ''}</Text>
                  <Pressable onPress={() => setDeleteId(a.id)} accessibilityRole="button" accessibilityLabel="Delete address">
                    <Text style={styles.delete}>Delete</Text>
                  </Pressable>
                </View>
                <Text style={styles.text}>{a.house}, {a.street}</Text>
                <Text style={styles.text}>{a.area}, {a.city}</Text>
                {a.directions ? <Text style={styles.meta}>{a.directions}</Text> : null}
              </Card>
            ))}
            {showForm ? (
              <Card style={styles.form}>
                <View style={styles.chips}>
                  {(['home', 'work', 'other'] as const).map((l) => (
                    <Pressable key={l} onPress={() => setForm((f) => ({ ...f, label: l }))} style={[styles.chip, form.label === l && styles.chipActive]}>
                      <Text style={[styles.chipText, form.label === l && styles.chipTextActive]}>{l}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput label="House / flat" value={form.house} onChangeText={(t) => setForm((f) => ({ ...f, house: t }))} placeholder="House 12, Flat 3-B" />
                <TextInput label="Street" value={form.street} onChangeText={(t) => setForm((f) => ({ ...f, street: t }))} placeholder="Street 5" />
                <TextInput label="Area" value={form.area} onChangeText={(t) => setForm((f) => ({ ...f, area: t }))} placeholder="DHA Phase 5" />
                <TextInput label="City" value={form.city} onChangeText={(t) => setForm((f) => ({ ...f, city: t }))} placeholder="Karachi" />
                <TextInput label="Directions (optional)" value={form.directions} onChangeText={(t) => setForm((f) => ({ ...f, directions: t }))} placeholder="Near the big mosque…" />
                {formError ? <Text style={styles.error}>{formError}</Text> : null}
                <View style={styles.formActions}>
                  <Button title="Cancel" onPress={() => setShowForm(false)} variant="secondary" style={styles.half} />
                  <Button title="Save" onPress={save} loading={saving} style={styles.half} />
                </View>
              </Card>
            ) : (
              <Button title="+ Add address" onPress={() => setShowForm(true)} variant="secondary" />
            )}
          </View>
        )}
      </ScrollView>
      <ConfirmDialog
        visible={!!deleteId}
        title="Delete address?"
        message="This address will be removed from your account. Existing bookings keep their saved address."
        confirmTitle="Delete"
        destructive
        onConfirm={doDelete}
        onCancel={() => setDeleteId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite, paddingTop: 52 },
  back: { fontSize: 15, fontWeight: '600', color: C.primary, paddingHorizontal: 16, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: C.darkNavy, paddingHorizontal: 16, marginBottom: 12 },
  list: { flex: 1 },
  inner: { padding: 16, paddingTop: 0 },
  card: { marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '700', color: C.primary },
  delete: { fontSize: 13, fontWeight: '600', color: C.error },
  text: { fontSize: 14, color: C.darkNavy, marginTop: 2 },
  meta: { fontSize: 12, color: C.secondaryText, marginTop: 4 },
  form: { marginTop: 4 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1.5, borderColor: C.borderGray, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.pureWhite },
  chipActive: { borderColor: C.primary, backgroundColor: C.lightGreen },
  chipText: { fontSize: 13, fontWeight: '600', color: C.secondaryText, textTransform: 'capitalize' },
  chipTextActive: { color: C.deepGreen },
  error: { fontSize: 13, color: C.error, marginBottom: 8 },
  formActions: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
