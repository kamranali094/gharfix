import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BRAND, VERIFICATION_STATUS_LABELS, type ProviderProfile } from '@gharfix/shared';
import { useAuth } from '../../lib/auth';
import { getMyProviderProfile, updateProviderProfile, createTicket, errMsg } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { Badge } from '../../components/ui/Badge';
import { RatingStars } from '../../components/ui/RatingStars';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

const C = BRAND.colors;

export default function ProviderProfileScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prov, setProv] = useState<ProviderProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const p = await getMyProviderProfile();
      setProv(p);
      if (p) {
        setDisplayName(p.display_name);
        setBio(p.bio ?? '');
        setCity(p.city);
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

  const save = async () => {
    if (displayName.trim().length < 3) {
      setMsg('Display name must be at least 3 characters.');
      return;
    }
    setSaving(true);
    try {
      await updateProviderProfile({ display_name: displayName.trim(), bio: bio.trim() || null, city: city.trim() });
      setEditing(false);
      setMsg('Profile updated.');
      load();
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const contactSupport = async (category: string, description: string) => {
    try {
      await createTicket({ category, priority: 'medium', description });
      setMsg('Support ticket created — we will get back to you.');
    } catch (e) {
      setMsg(errMsg(e));
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
      <Text style={styles.title}>Profile</Text>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{prov.display_name}</Text>
          <Badge status={prov.verification_status} />
        </View>
        <Text style={styles.meta}>Verification: {VERIFICATION_STATUS_LABELS[prov.verification_status]}</Text>
        <View style={styles.ratingRow}>
          <RatingStars rating={prov.rating_avg} showValue />
          <Text style={styles.meta}>({prov.rating_count} reviews)</Text>
        </View>
        {prov.bio ? <Text style={styles.bio}>{prov.bio}</Text> : null}
        <Text style={styles.meta}>📍 {prov.city || '—'} • {prov.experience_years ?? '—'} yrs experience</Text>
        <Text style={styles.meta}>Signed in as {profile?.phone}</Text>
      </Card>

      <SectionHeader title="Edit profile" />
      <Card>
        {editing ? (
          <View>
            <TextInput label="Display name" value={displayName} onChangeText={setDisplayName} />
            <TextInput label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={3} />
            <TextInput label="City" value={city} onChangeText={setCity} />
            <View style={styles.row}>
              <Button title="Cancel" onPress={() => setEditing(false)} variant="secondary" style={styles.half} />
              <Button title="Save" onPress={save} loading={saving} style={styles.half} />
            </View>
            <Text style={styles.fine}>Changing verification-sensitive fields may require re-review by our team.</Text>
          </View>
        ) : (
          <Button title="Edit profile" onPress={() => setEditing(true)} variant="secondary" />
        )}
      </Card>

      <SectionHeader title="Support" />
      <Card>
        <MenuRow label="Availability & blocked dates" onPress={() => router.push('/(provider)/availability')} />
        <MenuRow label="Payment / earnings query" onPress={() => contactSupport('payment_issue', `Earnings query from provider ${prov.display_name} (${prov.user_id}).`)} />
        <MenuRow label="Verification query" onPress={() => contactSupport('verification_query', `Verification query from provider ${prov.display_name} (${prov.user_id}). Current status: ${prov.verification_status}.`)} />
        <MenuRow label="Log out" danger onPress={() => setLogoutOpen(true)} last />
      </Card>
      <View style={{ height: 32 }} />

      <ConfirmDialog
        visible={logoutOpen}
        title="Log out?"
        message="You will need your phone number and an OTP to sign back in."
        confirmTitle="Log out"
        onConfirm={async () => { await signOut(); router.replace('/(auth)/phone'); }}
        onCancel={() => setLogoutOpen(false)}
      />
    </ScrollView>
  );
}

function MenuRow({ label, onPress, danger = false, last = false }: { label: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.menuRow, !last && styles.menuBorder]} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={[styles.menuLabel, danger && styles.danger]}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  inner: { padding: 16, paddingTop: 52 },
  title: { fontSize: 24, fontWeight: '800', color: C.darkNavy, marginBottom: 12 },
  msg: { fontSize: 13, color: C.deepGreen, backgroundColor: C.lightGreen, borderRadius: 10, padding: 10, marginBottom: 8, lineHeight: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  name: { fontSize: 20, fontWeight: '800', color: C.darkNavy, flex: 1, marginRight: 8 },
  meta: { fontSize: 13, color: C.secondaryText, marginTop: 6, lineHeight: 19 },
  bio: { fontSize: 14, color: C.darkNavy, marginTop: 10, lineHeight: 21 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  fine: { fontSize: 11, color: C.secondaryText, marginTop: 10, lineHeight: 16 },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: C.softGray },
  menuLabel: { fontSize: 15, color: C.darkNavy, fontWeight: '500' },
  danger: { color: C.error },
  chevron: { fontSize: 20, color: C.secondaryText },
});
