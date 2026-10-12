import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { BRAND } from '@gharfix/shared';
import { useAuth } from '../../lib/auth';

const C = BRAND.colors;

function ProviderGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace('/(auth)/phone');
    else if (profile && profile.role === 'customer') router.replace('/(customer)');
  }, [loading, session, profile, router]);

  if (loading || !session || !profile) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }
  return <>{children}</>;
}

export default function ProviderLayout() {
  return (
    <ProviderGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.secondaryText,
          tabBarStyle: { borderTopColor: C.borderGray, paddingBottom: 6, height: 62 },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="jobs" options={{ title: 'Jobs' }} />
        <Tabs.Screen name="earnings" options={{ title: 'Earnings' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="register" options={{ href: null }} />
        <Tabs.Screen name="availability" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="job/[id]" options={{ href: null }} />
      </Tabs>
    </ProviderGuard>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.warmWhite },
});
