import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { BRAND } from '@gharfix/shared';
import { useAuth } from '../../lib/auth';

const C = BRAND.colors;

function CustomerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace('/(auth)/phone');
    else if (profile && profile.role === 'provider') router.replace('/(provider)');
    else if (profile && profile.role === 'admin') router.replace('/(auth)/phone');
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

export default function CustomerLayout() {
  return (
    <CustomerGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.secondaryText,
          tabBarStyle: { borderTopColor: C.borderGray, paddingBottom: 6, height: 62 },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="bookings" options={{ title: 'Bookings' }} />
        <Tabs.Screen name="favorites" options={{ title: 'Favorites' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        {/* Non-tab screens */}
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="addresses" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="support" options={{ href: null }} />
        <Tabs.Screen name="provider/[id]" options={{ href: null }} />
        <Tabs.Screen name="book/[serviceId]" options={{ href: null }} />
        <Tabs.Screen name="booking/[id]" options={{ href: null }} />
      </Tabs>
    </CustomerGuard>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.warmWhite },
});
