import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BRAND, formatPKR, type ServiceCategory, type Service, type Booking, type CustomerAddress } from '@gharfix/shared';
import { useAuth } from '../../lib/auth';
import { useLocale } from '../../lib/locale';
import { getCategories, getServices, getMyBookings, getAddresses, errMsg } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { BookingBadge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { LogoHorizontal } from '../../components/ui/Logo';

const C = BRAND.colors;
const ACTIVE_STATUSES = ['pending', 'accepted', 'provider_assigned', 'on_the_way', 'arrived', 'in_progress', 'awaiting_quote_approval'] as const;

export default function CustomerHome() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [popular, setPopular] = useState<Service[]>([]);
  const [recent, setRecent] = useState<Booking[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [cats, svcs, books, addrs] = await Promise.all([
        getCategories(),
        getServices(),
        getMyBookings(),
        getAddresses(),
      ]);
      setCategories(cats.slice(0, 8));
      setPopular(svcs.slice(0, 6));
      setRecent(books.slice(0, 3));
      setAddresses(addrs);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const activeBooking = recent.find((b) => (ACTIVE_STATUSES as readonly string[]).includes(b.status));

  if (loading) {
    return (
      <View style={styles.wrap}>
        <LoadingSkeleton />
      </View>
    );
  }
  if (error && categories.length === 0) {
    return (
      <View style={styles.wrap}>
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />}
    >
      <View style={styles.header}>
        <LogoHorizontal size={34} />
        <Pressable onPress={() => router.push('/(customer)/notifications')} accessibilityRole="button" accessibilityLabel="Notifications">
          <Text style={styles.bell}>◉</Text>
        </Pressable>
      </View>
      <Text style={styles.greeting}>Assalam-o-Alaikum{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋</Text>

      {/* Address selector */}
      <Pressable onPress={() => router.push('/(customer)/addresses')} accessibilityRole="button" accessibilityLabel="Choose address">
        <Card style={styles.addressCard}>
          <Text style={styles.addressLabel}>📍 Deliver to</Text>
          <Text style={styles.addressValue} numberOfLines={1}>
            {defaultAddress ? `${defaultAddress.area}, ${defaultAddress.city}` : 'Add your address'}
          </Text>
        </Card>
      </Pressable>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={t('searchServices')}
        onSubmit={() => router.push({ pathname: '/(customer)/search', params: { q: query } })}
        style={styles.search}
      />

      {/* Promo banner slot (driven by platform settings in a later phase) */}
      <View style={styles.promo}>
        <Text style={styles.promoTitle}>Flat 15% off your first deep clean</Text>
        <Text style={styles.promoBody}>Verified professionals • Transparent pricing in PKR</Text>
      </View>

      {activeBooking ? (
        <Pressable onPress={() => router.push({ pathname: '/(customer)/booking/[id]', params: { id: activeBooking.id } })}>
          <Card style={styles.activeCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.activeTitle}>Current booking • {activeBooking.reference}</Text>
              <BookingBadge status={activeBooking.status} />
            </View>
            <Text style={styles.activeBody}>Tap to track progress</Text>
          </Card>
        </Pressable>
      ) : null}

      <SectionHeader title="Categories" actionTitle="See all" onAction={() => router.push('/(customer)/search')} />
      {categories.length === 0 ? (
        <EmptyState title="No categories yet" message="Service categories will appear here once the platform team adds them." />
      ) : (
        <View style={styles.grid}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              style={styles.catCard}
              onPress={() => router.push({ pathname: '/(customer)/search', params: { categoryId: c.id } })}
              accessibilityRole="button"
              accessibilityLabel={c.name}
            >
              <Text style={styles.catIcon}>{categoryGlyph(c.icon)}</Text>
              <Text style={styles.catName} numberOfLines={2}>{c.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <SectionHeader title="Popular services" />
      {popular.map((s) => (
        <Pressable key={s.id} onPress={() => router.push({ pathname: '/(customer)/book/[serviceId]', params: { serviceId: s.id } })}>
          <Card style={styles.serviceRow}>
            <View style={styles.rowBetween}>
              <Text style={styles.serviceName}>{s.name}</Text>
              <Text style={styles.servicePrice}>
                {s.pricing_model === 'quotation' ? 'Quote-based' : s.pricing_model === 'fixed' ? formatPKR(s.base_price) : `from ${formatPKR(s.base_price)}`}
              </Text>
            </View>
            {s.description ? <Text style={styles.serviceDesc} numberOfLines={2}>{s.description}</Text> : null}
          </Card>
        </Pressable>
      ))}

      <SectionHeader title="Recent bookings" actionTitle="See all" onAction={() => router.push('/(customer)/bookings')} />
      {recent.length === 0 ? (
        <EmptyState title="No bookings yet" message="Your recent bookings will show up here." actionTitle="Book a service" onAction={() => router.push('/(customer)/search')} />
      ) : (
        recent.map((b) => (
          <Pressable key={b.id} onPress={() => router.push({ pathname: '/(customer)/booking/[id]', params: { id: b.id } })}>
            <Card style={styles.serviceRow}>
              <View style={styles.rowBetween}>
                <Text style={styles.serviceName}>{b.reference}</Text>
                <BookingBadge status={b.status} />
              </View>
              <Text style={styles.serviceDesc} numberOfLines={2}>{b.description}</Text>
              <View style={styles.rowBetween}>
                <Text style={styles.servicePrice}>{formatPKR(b.total_estimate)}</Text>
                <Text style={styles.rebook} onPress={() => router.push('/(customer)/search')}>Book again</Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}

      <Pressable onPress={() => router.push('/(customer)/support')} style={styles.help}>
        <Text style={styles.helpText}>Need help? Visit the Help Center</Text>
      </Pressable>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function categoryGlyph(icon: string): string {
  const map: Record<string, string> = {
    electrician: '💡', plumber: '🔧', ac: '❄️', carpenter: '🪚', cleaning: '🧹',
    appliance: '🔌', painter: '🎨', gardener: '🌱', pest: '🐜', handyman: '🛠️', wrench: '🔧',
  };
  return map[icon] ?? '🏠';
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  inner: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bell: { fontSize: 26, color: C.darkNavy },
  greeting: { fontSize: 20, fontWeight: '800', color: C.darkNavy, marginBottom: 12 },
  addressCard: { marginBottom: 12 },
  addressLabel: { fontSize: 12, color: C.secondaryText },
  addressValue: { fontSize: 15, fontWeight: '700', color: C.darkNavy, marginTop: 2 },
  search: { marginBottom: 12 },
  promo: { backgroundColor: C.deepGreen, borderRadius: 14, padding: 16, marginBottom: 6 },
  promoTitle: { fontSize: 16, fontWeight: '800', color: C.pureWhite },
  promoBody: { fontSize: 12, color: C.lightGreen, marginTop: 4 },
  activeCard: { marginTop: 12, borderColor: C.primary, borderWidth: 1.5 },
  activeTitle: { fontSize: 14, fontWeight: '700', color: C.darkNavy },
  activeBody: { fontSize: 12, color: C.secondaryText, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: '23%', aspectRatio: 0.85, backgroundColor: C.pureWhite, borderRadius: 12,
    borderWidth: 1, borderColor: C.borderGray, alignItems: 'center', justifyContent: 'center', padding: 6,
  },
  catIcon: { fontSize: 26 },
  catName: { fontSize: 11, fontWeight: '600', color: C.darkNavy, textAlign: 'center', marginTop: 6 },
  serviceRow: { marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { fontSize: 15, fontWeight: '700', color: C.darkNavy, flex: 1, marginRight: 8 },
  servicePrice: { fontSize: 14, fontWeight: '700', color: C.primary },
  serviceDesc: { fontSize: 13, color: C.secondaryText, marginTop: 6, lineHeight: 19 },
  rebook: { fontSize: 13, fontWeight: '600', color: C.primary, marginTop: 6 },
  help: { alignItems: 'center', marginTop: 18 },
  helpText: { fontSize: 14, fontWeight: '600', color: C.primary },
});
