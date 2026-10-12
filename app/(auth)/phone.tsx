import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND, pkPhoneSchema, normalizePkPhone } from '@gharfix/shared';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { errMsg } from '../../lib/api';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { LogoMark } from '../../components/ui/Logo';

const C = BRAND.colors;
const OTP_DEV_MODE = process.env.EXPO_PUBLIC_OTP_DEV_MODE === 'true';

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setNotice(null);
    const parsed = pkPhoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid phone number');
      return;
    }
    let normalized: string;
    try {
      normalized = normalizePkPhone(parsed.data);
    } catch (e) {
      setError(errMsg(e));
      return;
    }
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (otpError) throw otpError;
      router.push({ pathname: '/(auth)/otp', params: { phone: normalized } });
    } catch (e) {
      // Honest fallback: without an SMS provider configured, Supabase cannot send the code.
      if (OTP_DEV_MODE) {
        setNotice(
          'SMS provider not configured — this is dev mode. Continue to preview the OTP screen and enter 123456.',
        );
        router.push({ pathname: '/(auth)/otp', params: { phone: normalized, dev: '1' } });
      } else {
        setError(`${errMsg(e)} (SMS provider not configured — see setup docs.)`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <LogoMark size={72} />
        <Text style={styles.title}>Welcome to {BRAND.name}</Text>
        <Text style={styles.subtitle}>Sign in with your mobile number to book trusted home services.</Text>
        {!isSupabaseConfigured() ? (
          <Text style={styles.configWarn}>
            Supabase is not configured yet — copy apps/mobile/.env.example to .env and add your project URL and anon key.
          </Text>
        ) : null}
        <TextInput
          label="Mobile number"
          value={phone}
          onChangeText={setPhone}
          placeholder="0300 1234567"
          keyboardType="phone-pad"
          error={error}
          hint="Pakistani mobile number, e.g. 03001234567 or +923001234567"
        />
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <Button title="Send OTP" onPress={submit} loading={loading} style={styles.button} />
        <Text style={styles.terms}>By continuing you accept our Terms of Service and Privacy Policy.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  inner: { padding: 24, paddingTop: 72 },
  title: { fontSize: 26, fontWeight: '800', color: C.darkNavy, marginTop: 20 },
  subtitle: { fontSize: 14, color: C.secondaryText, marginTop: 8, marginBottom: 24, lineHeight: 21 },
  button: { marginTop: 8 },
  terms: { fontSize: 12, color: C.secondaryText, textAlign: 'center', marginTop: 18, lineHeight: 18 },
  notice: {
    fontSize: 13,
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    lineHeight: 19,
  },
  configWarn: {
    fontSize: 13,
    color: C.error,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    lineHeight: 19,
  },
});
