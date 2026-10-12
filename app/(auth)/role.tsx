import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND, type UserRole } from '@gharfix/shared';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { errMsg } from '../../lib/api';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';

const C = BRAND.colors;

export default function RoleScreen() {
  const router = useRouter();
  const { session, refreshProfile } = useAuth();
  const [role, setRole] = useState<UserRole>('customer');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!session) {
    return (
      <View style={styles.wrap}>
        <ErrorState message="Your session expired. Please sign in again." onRetry={() => router.replace('/(auth)/phone')} />
      </View>
    );
  }

  const submit = async () => {
    setNameError(null);
    setError(null);
    if (name.trim().length < 3) {
      setNameError('Please enter your full name.');
      return;
    }
    setLoading(true);
    try {
      const userId = session.user.id;
      const phone = (session.user.phone ?? session.user.user_metadata?.phone ?? '') as string;
      const { error: pErr } = await supabase.from('profiles').upsert({
        id: userId,
        phone,
        full_name: name.trim(),
        role,
        terms_accepted_at: new Date().toISOString(),
        is_active: true,
      });
      if (pErr) throw pErr;
      if (role === 'provider') {
        // Create a stub provider profile; full registration happens in the provider app.
        const { error: ppErr } = await supabase.from('provider_profiles').upsert({
          user_id: userId,
          display_name: name.trim(),
          city: '',
          verification_status: 'not_submitted',
          rating_avg: 0,
          rating_count: 0,
          completed_jobs: 0,
          is_active: true,
        });
        if (ppErr) throw ppErr;
      }
      await refreshProfile();
      router.replace(role === 'provider' ? '/(provider)' : '/(customer)');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>How will you use {BRAND.name}?</Text>
      <Text style={styles.subtitle}>Choose your role. You can switch later by contacting support.</Text>
      {( ['customer', 'provider'] as UserRole[] ).map((r) => (
        <Pressable key={r} onPress={() => setRole(r)} accessibilityRole="radio" accessibilityState={{ selected: role === r }}>
          <Card style={[styles.roleCard, role === r && styles.roleCardActive]}>
            <Text style={styles.roleTitle}>{r === 'customer' ? 'I need a service' : 'I provide services'}</Text>
            <Text style={styles.roleBody}>
              {r === 'customer'
                ? 'Book electricians, plumbers, cleaners and more for your home.'
                : 'Receive job requests, manage your schedule and grow your earnings.'}
            </Text>
          </Card>
        </Pressable>
      ))}
      <TextInput label="Full name" value={name} onChangeText={setName} placeholder="e.g. Ahmed Khan" error={nameError} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Continue" onPress={submit} loading={loading} style={styles.button} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  inner: { padding: 24, paddingTop: 72 },
  title: { fontSize: 26, fontWeight: '800', color: C.darkNavy },
  subtitle: { fontSize: 14, color: C.secondaryText, marginTop: 8, marginBottom: 20, lineHeight: 21 },
  roleCard: { marginBottom: 12, borderWidth: 1.5 },
  roleCardActive: { borderColor: C.primary, backgroundColor: C.lightGreen },
  roleTitle: { fontSize: 16, fontWeight: '700', color: C.darkNavy },
  roleBody: { fontSize: 13, color: C.secondaryText, marginTop: 6, lineHeight: 19 },
  button: { marginTop: 12 },
  error: { fontSize: 13, color: C.error, marginBottom: 8, lineHeight: 19 },
});
