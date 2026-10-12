import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRAND } from '@gharfix/shared';
import { useAuth } from '../lib/auth';
import { LogoMark } from '../components/ui/Logo';

const C = BRAND.colors;

export default function Splash() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    (async () => {
      if (!session) {
        const seen = await AsyncStorage.getItem('gharfix_onboarded');
        router.replace(seen ? '/(auth)/phone' : '/onboarding');
        return;
      }
      if (!profile) {
        // Session exists but no GharFix profile yet → finish onboarding (role choice)
        router.replace('/(auth)/role');
        return;
      }
      router.replace(profile.role === 'provider' ? '/(provider)' : '/(customer)');
    })();
  }, [loading, session, profile, router]);

  return (
    <View style={styles.wrap}>
      <LogoMark size={96} />
      <Text style={styles.name}>{BRAND.name}</Text>
      <Text style={styles.tagline}>{BRAND.tagline}</Text>
      <ActivityIndicator color={C.pureWhite} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', padding: 24 },
  name: { fontSize: 34, fontWeight: '800', color: C.pureWhite, marginTop: 18, letterSpacing: 0.5 },
  tagline: { fontSize: 15, color: C.lightGreen, marginTop: 8, textAlign: 'center' },
  spinner: { marginTop: 32 },
});
