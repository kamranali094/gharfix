import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  BRAND,
  addressSchema,
  bookingCreateSchema,
  buildPriceSnapshot,
  generateIdempotencyKey,
  isFutureDateTime,
  DEFAULT_TIME_SLOTS,
  MAX_BOOKING_PHOTOS,
  type Service,
  type ServiceCategory,
  type CustomerAddress,
  type PriceSnapshot,
  type Urgency,
} from '@gharfix/shared';
import {
  getService,
  getCategories,
  getAddresses,
  createAddress,
  searchProviders,
  createBooking,
  uploadImage,
  errMsg,
  type PickedImage,
  type ProviderCard,
} from '../../../lib/api';
import { TextInput } from '../../../components/ui/TextInput';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PriceSummary } from '../../../components/ui/PriceSummary';
import { RatingStars } from '../../../components/ui/RatingStars';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';

const C = BRAND.colors;
const TOTAL_STEPS = 7;

const URGENCIES: { value: Urgency; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'scheduled', label: 'Scheduled' },
];

function nextDays(n: number): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' });
    out.push({ iso, label });
  }
  return out;
}

export default function BookingFlow() {
  const router = useRouter();
  const { serviceId, providerId } = useLocalSearchParams<{ serviceId: string; providerId?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [category, setCategory] = useState<ServiceCategory | null>(null);

  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const [descError, setDescError] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<Urgency>('normal');
  const [photos, setPhotos] = useState<PickedImage[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrForm, setAddrForm] = useState<{ label: 'home' | 'work' | 'other'; house: string; street: string; area: string; city: string; directions: string }>({ label: 'home', house: '', street: '', area: '', city: '', directions: '' });
  const [addrError, setAddrError] = useState<string | null>(null);

  const [asap, setAsap] = useState(false);
  const [dateIso, setDateIso] = useState(nextDays(14)[0].iso);
  const [slotIdx, setSlotIdx] = useState(0);
  const [schedError, setSchedError] = useState<string | null>(null);

  const [providers, setProviders] = useState<ProviderCard[]>([]);
  const [chosenProvider, setChosenProvider] = useState<string | null>(providerId ?? null);

  const [submitting, setSubmitting] = useState(false);
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const idempotencyKey = useRef(generateIdempotencyKey());

  const load = useCallback(async () => {
    try {
      setError(null);
      const [svc, cats, addrs] = await Promise.all([getService(serviceId), getCategories(), getAddresses()]);
      setService(svc);
      setCategory(cats.find((c) => c.id === svc.category_id) ?? null);
      setAddresses(addrs);
      const def = addrs.find((a) => a.is_default) ?? addrs[0];
      if (def) setAddressId(def.id);
      const provs = await searchProviders({ categoryId: svc.category_id });
      setProviders(provs);
      if (providerId && !provs.some((p) => p.profile.user_id === providerId)) {
        setChosenProvider(null); // pre-selected provider no longer eligible
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [serviceId, providerId]);

  useEffect(() => {
    load();
  }, [load]);

  const pickPhoto = async () => {
    setPhotoError(null);
    if (photos.length >= MAX_BOOKING_PHOTOS) {
      setPhotoError(`Maximum ${MAX_BOOKING_PHOTOS} photos.`);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    const mime = a.mimeType ?? 'image/jpeg';
    const img: PickedImage = { uri: a.uri, mime, bytes: a.fileSize ?? 0 };
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      setPhotoError('Only JPG, PNG or WebP images are allowed.');
      return;
    }
    if (img.bytes > 5 * 1024 * 1024) {
      setPhotoError('Each photo must be under 5 MB.');
      return;
    }
    setPhotos((p) => [...p, img]);
  };

  const saveAddress = async () => {
    setAddrError(null);
    const parsed = addressSchema.safeParse({ ...addrForm, is_default: addresses.length === 0 });
    if (!parsed.success) {
      setAddrError(parsed.error.issues[0]?.message ?? 'Invalid address');
      return;
    }
    try {
      const created = await createAddress(parsed.data);
      setAddresses((a) => [created, ...a]);
      setAddressId(created.id);
      setShowAddressForm(false);
      setAddrForm({ label: 'home', house: '', street: '', area: '', city: '', directions: '' });
    } catch (e) {
      setAddrError(errMsg(e));
    }
  };

  const scheduledAt = (): string | null => {
    if (asap) return null;
    const slot = DEFAULT_TIME_SLOTS[slotIdx];
    return `${dateIso}T${slot.start}:00+05:00`; // Asia/Karachi
  };

  const validateStep = (): boolean => {
    if (step === 2) {
      const d = bookingCreateSchema.shape.description.safeParse(description);
      if (!d.success) {
        setDescError(d.error.issues[0]?.message ?? 'Invalid description');
        return false;
      }
      setDescError(null);
      return true;
    }
    if (step === 3 && !addressId) {
      Alert.alert('Address required', 'Please select or add an address.');
      return false;
    }
    if (step === 4 && !asap) {
      const iso = scheduledAt();
      if (!iso || !isFutureDateTime(iso)) {
        setSchedError('Please choose a future date and time slot.');
        return false;
      }
      setSchedError(null);
    }
    return true;
  };

  const snapshot: PriceSnapshot | null = service
    ? buildPriceSnapshot({
        labour: service.pricing_model === 'fixed' ? service.base_price : 0,
        inspectionFee: service.inspection_fee,
        pricingModel: service.pricing_model,
      })
    : null;

  const confirm = async () => {
    if (!service || !addressId || !snapshot) return;
    setSubmitting(true);
    try {
      // Upload problem photos first (validated size/type at pick time)
      const paths: string[] = [];
      for (const img of photos) {
        paths.push(await uploadImage('booking-photos', 'problems', img));
      }
      const booking = await createBooking({
        categoryId: service.category_id,
        serviceId: service.id,
        addressId,
        description: description.trim(),
        photos: paths,
        urgency,
        asap,
        scheduledAt: scheduledAt(),
        providerId: chosenProvider,
        service,
        idempotencyKey: idempotencyKey.current, // double-tap safe
      });
      setDoneRef(booking.reference);
      setDoneId(booking.id);
      setStep(8);
    } catch (e) {
      Alert.alert('Booking failed', errMsg(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.wrap}>
        <LoadingSkeleton />
      </View>
    );
  }
  if (error || !service || !snapshot) {
    return (
      <View style={styles.wrap}>
        <ErrorState message={error ?? 'Service not found.'} onRetry={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  const chosenAddr = addresses.find((a) => a.id === addressId);
  const chosenProv = providers.find((p) => p.profile.user_id === chosenProvider);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.inner}>
      <View style={styles.topRow}>
        <Pressable onPress={() => (step > 1 && step < 8 ? setStep(step - 1) : router.back())} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        {step <= TOTAL_STEPS ? <Text style={styles.stepText}>Step {step} of {TOTAL_STEPS}</Text> : null}
      </View>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${Math.min(100, (step / TOTAL_STEPS) * 100)}%` }]} />
      </View>

      {step === 1 && (
        <View>
          <Text style={styles.title}>Confirm service</Text>
          <Card>
            <Text style={styles.serviceName}>{service.name}</Text>
            {category ? <Text style={styles.meta}>{category.name}</Text> : null}
            {service.description ? <Text style={styles.desc}>{service.description}</Text> : null}
            <Text style={[styles.meta, styles.mt]}>
              Pricing: {service.pricing_model === 'fixed' ? 'Fixed price' : service.pricing_model === 'starting' ? 'Starting price' : 'Quotation-based'}
            </Text>
          </Card>
          <Button title="Continue" onPress={() => setStep(2)} style={styles.cta} />
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={styles.title}>Describe the problem</Text>
          <TextInput
            label="What needs fixing?"
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. The kitchen tap is leaking continuously and the cabinet below is damp…"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            error={descError}
            containerStyle={{ minHeight: 130 }}
          />
          <Text style={styles.label}>Urgency</Text>
          <View style={styles.chips}>
            {URGENCIES.map((u) => (
              <Pressable key={u.value} onPress={() => setUrgency(u.value)} style={[styles.chip, urgency === u.value && styles.chipActive]} accessibilityRole="radio" accessibilityState={{ selected: urgency === u.value }}>
                <Text style={[styles.chipText, urgency === u.value && styles.chipTextActive]}>{u.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Photos (optional, max {MAX_BOOKING_PHOTOS})</Text>
          <View style={styles.photoRow}>
            {photos.map((p, i) => (
              <View key={i} style={styles.thumbWrap}>
                <Image source={{ uri: p.uri }} style={styles.thumb} />
                <Pressable style={styles.thumbRemove} onPress={() => setPhotos((x) => x.filter((_, j) => j !== i))} accessibilityLabel="Remove photo">
                  <Text style={styles.thumbRemoveText}>✕</Text>
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_BOOKING_PHOTOS ? (
              <Pressable style={styles.addPhoto} onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="Add photo">
                <Text style={styles.addPhotoText}>＋</Text>
              </Pressable>
            ) : null}
          </View>
          {photoError ? <Text style={styles.error}>{photoError}</Text> : null}
          <Button title="Continue" onPress={() => validateStep() && setStep(3)} style={styles.cta} />
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={styles.title}>Select location</Text>
          {addresses.map((a) => (
            <Pressable key={a.id} onPress={() => setAddressId(a.id)} accessibilityRole="radio" accessibilityState={{ selected: addressId === a.id }}>
              <Card style={[styles.addrCard, addressId === a.id && styles.addrCardActive]}>
                <Text style={styles.addrLabel}>{a.label.toUpperCase()}{a.is_default ? ' • Default' : ''}</Text>
                <Text style={styles.addrText}>{a.house}, {a.street}</Text>
                <Text style={styles.addrText}>{a.area}, {a.city}</Text>
              </Card>
            </Pressable>
          ))}
          {showAddressForm ? (
            <Card style={styles.mt}>
              <View style={styles.chips}>
                {(['home', 'work', 'other'] as const).map((l) => (
                  <Pressable key={l} onPress={() => setAddrForm((f) => ({ ...f, label: l }))} style={[styles.chip, addrForm.label === l && styles.chipActive]}>
                    <Text style={[styles.chipText, addrForm.label === l && styles.chipTextActive]}>{l}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput label="House / flat" value={addrForm.house} onChangeText={(t) => setAddrForm((f) => ({ ...f, house: t }))} placeholder="House 12, Flat 3-B" />
              <TextInput label="Street" value={addrForm.street} onChangeText={(t) => setAddrForm((f) => ({ ...f, street: t }))} placeholder="Street 5" />
              <TextInput label="Area" value={addrForm.area} onChangeText={(t) => setAddrForm((f) => ({ ...f, area: t }))} placeholder="DHA Phase 5" />
              <TextInput label="City" value={addrForm.city} onChangeText={(t) => setAddrForm((f) => ({ ...f, city: t }))} placeholder="Karachi" />
              <TextInput label="Directions (optional)" value={addrForm.directions} onChangeText={(t) => setAddrForm((f) => ({ ...f, directions: t }))} placeholder="Near the big mosque…" />
              {addrError ? <Text style={styles.error}>{addrError}</Text> : null}
              <Button title="Save address" onPress={saveAddress} />
            </Card>
          ) : (
            <Button title="+ Add new address" onPress={() => setShowAddressForm(true)} variant="secondary" style={styles.mt} />
          )}
          <Button title="Continue" onPress={() => validateStep() && setStep(4)} style={styles.cta} />
        </View>
      )}

      {step === 4 && (
        <View>
          <Text style={styles.title}>Select schedule</Text>
          <Pressable onPress={() => setAsap(!asap)} style={styles.asapRow} accessibilityRole="checkbox" accessibilityState={{ checked: asap }}>
            <View style={[styles.checkbox, asap && styles.checkboxOn]}>{asap ? <Text style={styles.check}>✓</Text> : null}</View>
            <Text style={styles.asapText}>As soon as possible</Text>
          </Pressable>
          {!asap && (
            <View>
              <Text style={styles.label}>Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
                {nextDays(14).map((d) => (
                  <Pressable key={d.iso} onPress={() => setDateIso(d.iso)} style={[styles.dateChip, dateIso === d.iso && styles.chipActive]}>
                    <Text style={[styles.chipText, dateIso === d.iso && styles.chipTextActive]}>{d.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.label}>Time slot</Text>
              {DEFAULT_TIME_SLOTS.map((s, i) => (
                <Pressable key={s.start} onPress={() => setSlotIdx(i)} style={[styles.slot, slotIdx === i && styles.slotActive]} accessibilityRole="radio" accessibilityState={{ selected: slotIdx === i }}>
                  <Text style={[styles.slotText, slotIdx === i && styles.chipTextActive]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {schedError ? <Text style={styles.error}>{schedError}</Text> : null}
          <Button title="Continue" onPress={() => validateStep() && setStep(5)} style={styles.cta} />
        </View>
      )}

      {step === 5 && (
        <View>
          <Text style={styles.title}>Choose provider</Text>
          <Pressable onPress={() => setChosenProvider(null)} accessibilityRole="radio" accessibilityState={{ selected: !chosenProvider }}>
            <Card style={[styles.addrCard, !chosenProvider && styles.addrCardActive]}>
              <Text style={styles.serviceName}>Let GharFix assign</Text>
              <Text style={styles.meta}>We match you with the best available verified provider.</Text>
            </Card>
          </Pressable>
          {providers.map((p) => (
            <Pressable key={p.profile.user_id} onPress={() => setChosenProvider(p.profile.user_id)} accessibilityRole="radio" accessibilityState={{ selected: chosenProvider === p.profile.user_id }}>
              <Card style={[styles.addrCard, chosenProvider === p.profile.user_id && styles.addrCardActive]}>
                <View style={styles.rowBetween}>
                  <Text style={styles.serviceName}>{p.profile.display_name}</Text>
                  <RatingStars rating={p.profile.rating_avg} size={13} showValue />
                </View>
                <Text style={styles.meta}>{p.profile.city} • {p.profile.completed_jobs} jobs done</Text>
              </Card>
            </Pressable>
          ))}
          {providers.length === 0 ? <Text style={styles.meta}>No verified providers in this category yet — GharFix will assign one when available.</Text> : null}
          <Button title="Continue" onPress={() => setStep(6)} style={styles.cta} />
        </View>
      )}

      {step === 6 && (
        <View>
          <Text style={styles.title}>Price details</Text>
          <Card>
            <PriceSummary snapshot={snapshot} />
          </Card>
          <Button title="Continue" onPress={() => setStep(7)} style={styles.cta} />
        </View>
      )}

      {step === 7 && (
        <View>
          <Text style={styles.title}>Review & confirm</Text>
          <Card>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.meta}>{description}</Text>
            <Text style={[styles.meta, styles.mt]}>📍 {chosenAddr ? `${chosenAddr.house}, ${chosenAddr.street}, ${chosenAddr.area}, ${chosenAddr.city}` : '—'}</Text>
            <Text style={styles.meta}>🕒 {asap ? 'As soon as possible' : `${dateIso} • ${DEFAULT_TIME_SLOTS[slotIdx].label}`}</Text>
            <Text style={styles.meta}>👷 {chosenProv ? chosenProv.profile.display_name : 'GharFix will assign a provider'}</Text>
            <Text style={styles.meta}>⚡ Urgency: {urgency}{photos.length ? ` • ${photos.length} photo(s)` : ''}</Text>
          </Card>
          <Card style={styles.mt}>
            <PriceSummary snapshot={snapshot} />
          </Card>
          <Button title="Confirm booking" onPress={confirm} loading={submitting} style={styles.cta} />
        </View>
      )}

      {step === 8 && (
        <View style={styles.done}>
          <Text style={styles.doneIcon}>✓</Text>
          <Text style={styles.title}>Booking confirmed!</Text>
          <Text style={styles.ref}>Reference: {doneRef}</Text>
          <Text style={styles.meta}>Status: Pending — {chosenProvider ? 'your provider has been notified.' : 'GharFix will assign a provider shortly.'}</Text>
          <Button
            title="View booking"
            onPress={() => doneId && router.replace({ pathname: '/(customer)/booking/[id]', params: { id: doneId } })}
            style={styles.cta}
          />
          <Button title="Back to home" onPress={() => router.replace('/(customer)')} variant="ghost" />
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  inner: { padding: 16, paddingTop: 52 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  back: { fontSize: 15, fontWeight: '600', color: C.primary },
  stepText: { fontSize: 13, color: C.secondaryText, fontWeight: '600' },
  progress: { height: 6, backgroundColor: C.softGray, borderRadius: 3, marginBottom: 16 },
  progressFill: { height: 6, backgroundColor: C.primary, borderRadius: 3 },
  title: { fontSize: 22, fontWeight: '800', color: C.darkNavy, marginBottom: 14 },
  serviceName: { fontSize: 16, fontWeight: '700', color: C.darkNavy },
  meta: { fontSize: 13, color: C.secondaryText, marginTop: 4, lineHeight: 19 },
  desc: { fontSize: 14, color: C.darkNavy, marginTop: 8, lineHeight: 21 },
  mt: { marginTop: 12 },
  cta: { marginTop: 20 },
  label: { fontSize: 14, fontWeight: '600', color: C.darkNavy, marginTop: 14, marginBottom: 8 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1.5, borderColor: C.borderGray, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.pureWhite },
  chipActive: { borderColor: C.primary, backgroundColor: C.lightGreen },
  chipText: { fontSize: 13, fontWeight: '600', color: C.secondaryText, textTransform: 'capitalize' },
  chipTextActive: { color: C.deepGreen },
  error: { fontSize: 13, color: C.error, marginTop: 8 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  thumbRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: C.error, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  thumbRemoveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  addPhoto: { width: 72, height: 72, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.borderGray, alignItems: 'center', justifyContent: 'center', backgroundColor: C.pureWhite },
  addPhotoText: { fontSize: 28, color: C.secondaryText },
  addrCard: { marginBottom: 10, borderWidth: 1.5 },
  addrCardActive: { borderColor: C.primary, backgroundColor: C.lightGreen },
  addrLabel: { fontSize: 11, fontWeight: '700', color: C.primary },
  addrText: { fontSize: 14, color: C.darkNavy, marginTop: 2 },
  asapRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.pureWhite, borderRadius: 12, borderWidth: 1, borderColor: C.borderGray, padding: 14 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.borderGray, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxOn: { backgroundColor: C.primary, borderColor: C.primary },
  check: { color: '#fff', fontWeight: '700' },
  asapText: { fontSize: 15, fontWeight: '600', color: C.darkNavy },
  dateRow: { marginBottom: 4 },
  dateChip: { borderWidth: 1.5, borderColor: C.borderGray, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.pureWhite, marginRight: 8 },
  slot: { borderWidth: 1.5, borderColor: C.borderGray, borderRadius: 12, padding: 14, backgroundColor: C.pureWhite, marginBottom: 8 },
  slotActive: { borderColor: C.primary, backgroundColor: C.lightGreen },
  slotText: { fontSize: 14, fontWeight: '600', color: C.darkNavy },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  done: { alignItems: 'center', paddingTop: 40 },
  doneIcon: { fontSize: 56, color: C.success, fontWeight: '800' },
  ref: { fontSize: 18, fontWeight: '800', color: C.primary, marginTop: 8 },
});
