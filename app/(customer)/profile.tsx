import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BRAND, maskPhone, type Locale } from '@gharfix/shared';
import { useAuth } from '../../lib/auth';
import { useLocale } from '../../lib/locale';
import {
  updateProfile,
  getNotificationPrefs,
  setNotificationPrefs,
  createTicket,
  errMsg,
} from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const C = BRAND.colors;

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut, refreshProfile } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({ booking_updates: true, promotions: false });
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (profile) {
      setName(profile.full_name);
      setEmail(profile.email ?? '');
    }
    try {
      setPrefs(await getNotificationPrefs());
    } catch {
      /* defaults */
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const saveProfile = async () => {
    if (name.trim().length < 3) {
      setMsg('Name must be at least 3 characters.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ full_name: name.trim(), email: email.trim() || null });
      await refreshProfile();
      setEditing(false);
      setMsg('Profile updated.');
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const togglePref = async (key: 'booking_updates' | 'promotions') => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await setNotificationPrefs(next);
    } catch (e) {
      setMsg(errMsg(e));
      setPrefs(prefs);
    }
  };

  const requestDeletion = async () => {
    setBusy(true);
    try {
      await createTicket({
        category: 'account_deletion',
        priority: 'high',
        description: `Account deletion requested by ${profile?.full_name} (${profile?.phone}). Please process per privacy policy.`,
      });
      setMsg('Deletion request submitted. Our team will contact you to confirm.');
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setBusy(false);
      setDeleteOpen(false);
    }
  };

  const doLogout = async () => {
    await signOut();
    router.replace('/(auth)/phone');
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>{t('profile')}</Text>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <SectionHeader title="Account" />
      <Card>
        {editing ? (
          <View>
            <TextInput label="Full name" value={name} onChangeText={setName} />
            <TextInput label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <View style={styles.row}>
              <Button title="Cancel" onPress={() => setEditing(false)} variant="secondary" style={styles.half} />
              <Button title="Save" onPress={saveProfile} loading={saving} style={styles.half} />
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.name}>{profile?.full_name}</Text>
            <Text style={styles.meta}>{profile?.phone ? maskPhone(profile.phone) : ''}</Text>
            {profile?.email ? <Text style={styles.meta}>{profile.email}</Text> : null}
            <Button title="Edit profile" onPress={() => setEditing(true)} variant="secondary" style={styles.mt} />
          </View>
        )}
      </Card>

      <SectionHeader title="Preferences" />
      <Card>
        <Text style={styles.label}>Language</Text>
        <View style={styles.row}>
          {(['en', 'ur'] as Locale[]).map((l) => (
            <Pressable key={l} onPress={() => setLocale(l)} style={[styles.chip, locale === l && styles.chipActive]} accessibilityRole="radio" accessibilityState={{ selected: locale === l }}>
              <Text style={[styles.chipText, locale === l && styles.chipTextActive]}>{l === 'en' ? 'English' : 'اردو'}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Booking updates</Text>
          <Switch value={prefs.booking_updates} onValueChange={() => togglePref('booking_updates')} trackColor={{ true: C.primary }} />
        </View>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Promotions & offers</Text>
          <Switch value={prefs.promotions} onValueChange={() => togglePref('promotions')} trackColor={{ true: C.primary }} />
        </View>
      </Card>

      <SectionHeader title="More" />
      <Card>
        <MenuRow label="My addresses" onPress={() => router.push('/(customer)/addresses')} />
        <MenuRow label="Notifications" onPress={() => router.push('/(customer)/notifications')} />
        <MenuRow label="Help Center" onPress={() => router.push('/(customer)/support')} />
        <MenuRow label="Privacy Policy" onPress={() => setMsg('Privacy Policy: https://gharfix.app/privacy (opens in browser in production).')} />
        <MenuRow label="Terms of Service" onPress={() => setMsg('Terms of Service: https://gharfix.app/terms (opens in browser in production).')} />
        <MenuRow label="Request account deletion" danger onPress={() => setDeleteOpen(true)} />
        <MenuRow label="Log out" danger onPress={() => setLogoutOpen(true)} last />
      </Card>
      <View style={{ height: 32 }} />

      <ConfirmDialog
        visible={logoutOpen}
        title="Log out?"
        message="You will need your phone number and an OTP to sign back in."
        confirmTitle="Log out"
        onConfirm={doLogout}
        onCancel={() => setLogoutOpen(false)}
      />
      <ConfirmDialog
        visible={deleteOpen}
        title="Request account deletion?"
        message="This sends a deletion request to our support team. They will verify your identity before deleting your data."
        confirmTitle="Send request"
        destructive
        loading={busy}
        onConfirm={requestDeletion}
        onCancel={() => setDeleteOpen(false)}
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
  title: { fontSize: 24, fontWeight: '800', color: C.darkNavy, marginBottom: 4 },
  msg: { fontSize: 13, color: C.deepGreen, backgroundColor: C.lightGreen, borderRadius: 10, padding: 10, marginBottom: 8, lineHeight: 18 },
  name: { fontSize: 18, fontWeight: '800', color: C.darkNavy },
  meta: { fontSize: 13, color: C.secondaryText, marginTop: 4 },
  mt: { marginTop: 12 },
  label: { fontSize: 14, fontWeight: '600', color: C.darkNavy, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  chip: { borderWidth: 1.5, borderColor: C.borderGray, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9, backgroundColor: C.pureWhite },
  chipActive: { borderColor: C.primary, backgroundColor: C.lightGreen },
  chipText: { fontSize: 14, fontWeight: '600', color: C.secondaryText },
  chipTextActive: { color: C.deepGreen },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.softGray, marginTop: 10 },
  prefLabel: { fontSize: 14, color: C.darkNavy, fontWeight: '500' },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: C.softGray },
  menuLabel: { fontSize: 15, color: C.darkNavy, fontWeight: '500' },
  danger: { color: C.error },
  chevron: { fontSize: 20, color: C.secondaryText },
});
