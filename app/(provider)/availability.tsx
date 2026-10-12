import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BRAND, type WorkingHours, type ProviderProfile } from '@gharfix/shared';
import {
  getMyProviderProfile,
  updateProviderProfile,
  getBlockedDates,
  addBlockedDate,
  removeBlockedDate,
  errMsg,
} from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const C = BRAND.colors;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function defaultHours(): WorkingHours {
  const h: WorkingHours = {};
  for (let d = 0; d < 7; d++) h[d] = ['09:00', '18:00'];
  return h;
}

export default function AvailabilityScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prov, setProv] = useState<ProviderProfile | null>(null);
  const [hours, setHours] = useState<WorkingHours>(defaultHours());
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState<{ id: string; blocked_date: string; reason: string | null }[]>([]);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const p = await getMyProviderProfile();
      setProv(p);
      if (p) {
        if (p.working_hours) setHours({ ...defaultHours(), ...p.working_hours });
        setBlocked(await getBlockedDates(p.user_id));
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const saveHours = async () => {
    // Server-side validation happens in the backend; client validates format too.
    for (let d = 0; d < 7; d++) {
      const h = hours[d];
      if (h && (!TIME_RE.test(h[0]) || !TIME_RE.test(h[1]) || h[0] >= h[1])) {
        setError(`${DAYS[d]}: use HH:MM 24h format with opening before closing, or mark closed.`);
        return;
      }
    }
    setSaving(true);
    try {
      await updateProviderProfile({ working_hours: hours });
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const addDate = async () => {
    setDateError(null);
    try {
      await addBlockedDate(newDate.trim(), newReason.trim() || null);
      setNewDate('');
      setNewReason('');
      if (prov) setBlocked(await getBlockedDates(prov.user_id));
    } catch (e) {
      setDateError(errMsg(e));
    }
  };

  const doRemove = async () => {
    if (!removeId) return;
    try {
      await removeBlockedDate(removeId);
      setBlocked((b) => b.filter((x) => x.id !== removeId));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setRemoveId(null);
    }
  };

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
  if (!prov) {
    return (
      <View style={styles.wrap}>
        <EmptyState title="No provider profile" message="Register as a provider first." actionTitle="Register" onAction={() => router.push('/(provider)/register')} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.inner}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>Availability</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SectionHeader title="Working hours" />
      <Card>
        {DAYS.map((day, d) => {
          const h = hours[d];
          const open = h != null;
          return (
            <View key={d} style={styles.dayRow}>
              <View style={styles.dayLeft}>
                <Text style={styles.dayName}>{day}</Text>
                <Switch
                  value={open}
                  onValueChange={(v) => setHours((prev) => ({ ...prev, [d]: v ? ['09:00', '18:00'] : null }))}
                  trackColor={{ true: C.primary }}
                  accessibilityLabel={`${day} open`}
                />
              </View>
              {open && h ? (
                <View style={styles.timeRow}>
                  <TextInput
                    value={h[0]}
                    onChangeText={(t) => setHours((prev) => ({ ...prev, [d]: [t, prev[d]?.[1] ?? '18:00'] }))}
                    placeholder="09:00"
                    containerStyle={styles.timeInput}
                    maxLength={5}
                  />
                  <Text style={styles.dash}>–</Text>
                  <TextInput
                    value={h[1]}
                    onChangeText={(t) => setHours((prev) => ({ ...prev, [d]: [prev[d]?.[0] ?? '09:00', t] }))}
                    placeholder="18:00"
                    containerStyle={styles.timeInput}
                    maxLength={5}
                  />
                </View>
              ) : (
                <Text style={styles.closed}>Closed</Text>
              )}
            </View>
          );
        })}
        <Button title="Save working hours" onPress={saveHours} loading={saving} style={styles.mt} />
      </Card>

      <SectionHeader title="Blocked dates" />
      <Card>
        <View style={styles.addRow}>
          <TextInput label="Date (YYYY-MM-DD)" value={newDate} onChangeText={setNewDate} placeholder="2026-12-25" containerStyle={styles.dateInput} maxLength={10} />
          <TextInput label="Reason (optional)" value={newReason} onChangeText={setNewReason} placeholder="Holiday" containerStyle={styles.reasonInput} />
        </View>
        {dateError ? <Text style={styles.error}>{dateError}</Text> : null}
        <Button title="Block date" onPress={addDate} variant="secondary" />
        <View style={styles.mt}>
          {blocked.length === 0 ? (
            <Text style={styles.meta}>No blocked dates.</Text>
          ) : (
            blocked.map((b) => (
              <View key={b.id} style={styles.blockedRow}>
                <View>
                  <Text style={styles.blockedDate}>{b.blocked_date}</Text>
                  {b.reason ? <Text style={styles.meta}>{b.reason}</Text> : null}
                </View>
                <Pressable onPress={() => setRemoveId(b.id)} accessibilityRole="button" accessibilityLabel="Unblock date">
                  <Text style={styles.unblock}>Unblock</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </Card>

      <ConfirmDialog
        visible={!!removeId}
        title="Unblock this date?"
        message="You will become available for bookings on this date again."
        confirmTitle="Unblock"
        onConfirm={doRemove}
        onCancel={() => setRemoveId(null)}
      />
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  inner: { padding: 16, paddingTop: 52 },
  back: { fontSize: 15, fontWeight: '600', color: C.primary, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: C.darkNavy, marginBottom: 4 },
  error: { fontSize: 13, color: C.error, marginTop: 8, lineHeight: 19 },
  meta: { fontSize: 13, color: C.secondaryText, lineHeight: 19 },
  mt: { marginTop: 12 },
  dayRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.softGray },
  dayLeft: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayName: { fontSize: 15, fontWeight: '600', color: C.darkNavy },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  timeInput: { flex: 1, marginBottom: 0 },
  dash: { fontSize: 18, color: C.secondaryText, marginHorizontal: 8 },
  closed: { fontSize: 13, color: C.secondaryText, fontStyle: 'italic', marginTop: 4 },
  addRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1 },
  reasonInput: { flex: 1.4 },
  blockedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.softGray },
  blockedDate: { fontSize: 14, fontWeight: '700', color: C.darkNavy },
  unblock: { fontSize: 13, fontWeight: '600', color: C.error },
});
