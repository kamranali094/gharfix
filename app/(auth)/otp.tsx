import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BRAND, otpCodeSchema } from '@gharfix/shared';
import { supabase } from '../../lib/supabase';
import { errMsg } from '../../lib/api';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';

const C = BRAND.colors;
const OTP_DEV_MODE = process.env.EXPO_PUBLIC_OTP_DEV_MODE === 'true';

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    const parsed = otpCodeSchema.safeParse(code.trim());
    if (!parsed.success) {
      setError('Enter the 6-digit code sent to your phone.');
      return;
    }
    // DEV ONLY: accept 123456 so the auth UI can be exercised without an SMS provider.
    // This never creates a real session by itself — verifyOtp below is still authoritative.
    const isDevCode = OTP_DEV_MODE && parsed.data === '123456';
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: String(phone),
        token: parsed.data,
        type: 'sms',
      });
      if (verifyError) throw verifyError;
      // Real session established → splash routes to role setup or home.
      router.replace('/');
    } catch (e) {
      if (isDevCode) {
        setError(
          'DEV ONLY preview: code 123456 is accepted by the UI, but no real session was created because the SMS/OTP provider is not configured. Configure an OTP provider in Supabase to sign in for real.',
        );
      } else {
        setError(`${errMsg(e)} (SMS provider not configured?)`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {OTP_DEV_MODE ? (
          <Text style={styles.devBanner}>DEV ONLY — SMS provider not configured. Test code: 123456</Text>
        ) : null}
        <Text style={styles.title}>Enter verification code</Text>
        <Text style={styles.subtitle}>We sent a code to {phone}. It expires in a few minutes.</Text>
        <TextInput
          label="OTP code"
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={8}
          error={error}
        />
        <Button title="Verify" onPress={submit} loading={loading} style={styles.button} />
        <Button title="Change number" onPress={() => router.back()} variant="ghost" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  inner: { padding: 24, paddingTop: 72 },
  devBanner: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 19,
  },
  title: { fontSize: 26, fontWeight: '800', color: C.darkNavy },
  subtitle: { fontSize: 14, color: C.secondaryText, marginTop: 8, marginBottom: 24, lineHeight: 21 },
  button: { marginTop: 8 },
});
