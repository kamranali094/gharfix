import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/onboarding');
    }, 1500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.name}>GharFix</Text>
      <Text style={styles.tagline}>Home Services, Fixed Right</Text>
      <ActivityIndicator color="#ffffff" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
  },
  tagline: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 8,
  },
  spinner: {
    marginTop: 24,
  },
});
