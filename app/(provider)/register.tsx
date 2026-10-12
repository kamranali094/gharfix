import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { BRAND, providerRegistrationSchema, type Service, type ServiceArea } from '@gharfix/shared';
import { getServices, getServiceAreas, registerProvider, getMyProviderProfile, errMsg, type PickedImage } from '../../lib/api';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';

const C = BRAND.colors;

const DOC_TYPES = [
  { type: 'cnic_front', label: 'CNIC front' },
  { type: 'cnic_back', label: 'CNIC back' },
];

export default function ProviderRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [areas, setAreas] = useState<ServiceArea[]>([]);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [city, setCity] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [docs, setDocs] = useState<Record<string, PickedImage>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const existing = await getMyProviderProfile();
        if (existing && existing.verification_status !== 'not_submitted') {
          router.replace('/(provider)');
          return;
        }
        const [svcs, ars] = await Promise.all([getServices(), getServiceAreas()]);
        setServices(svcs);
        setAreas(ars);
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const toggle = (list: string[], id: string, set: (v: string[]) => void) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const pickDoc = async (type: string) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    const mime = a.mimeType ?? 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      setFormError('Documents must be JPG, PNG or WebP.');
      return;
    }
    if ((a.fileSize ?? 0) > 5 * 1024 * 1024) {
      setFormError('Each document must be under 5 MB.');
      return;
    }
    setDocs((d) => ({ ...d, [type]: { uri: a.uri, mime, bytes: a.fileSize ?? 0 } }));
  };

  const submit = async () => {
    setFormError(null);
    const exp = experience.trim() === '' ? null : Number(experience);
    const parsed = providerRegistrationSchema.safeParse({
      full_name: displayName,
      phone: '03000000000', // schema requires phone; real phone comes from the auth profile
      display_name: displayName,
      bio: bio || null,
      experience_years: exp,
      city,
      service_ids: serviceIds,
      area_ids: areaIds,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Please complete all required fields.');
      return;
    }
    const missing = DOC_TYPES.filter((d) => !docs[d.type]);
    if (missing.length) {
      setFormError(`Please upload: ${missing.map((d) => d.label).join(', ')}.`);
      return;
    }
    setSaving(true);
    try {
      await registerProvider({
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        experienceYears: exp,
        city: city.trim(),
        serviceIds,
        areaIds,
        documents: Object.entries(docs).map(([type, image]) => ({ type, image })),
      });
      router.replace('/(provider)');
    } catch (e) {
      setFormError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.wrap}>
        <LoadingSkeleton />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.wrap}>
        <ErrorState message={error} onRetry={() => router.replace('/(provider)')} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.inner}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>Provider registration</Text>
      <Text style={styles.sub}>
        Your documents are stored privately and reviewed only by authorized GharFix staff. You will appear as
        “Verified” to customers only after approval.
      </Text>

      <SectionHeader title="Profile" />
      <Card>
        <TextInput label="Display name *" value={displayName} onChangeText={setDisplayName} placeholder="e.g. Ahmed Electrician" />
        <TextInput label="About you" value={bio} onChangeText={setBio} multiline numberOfLines={3} placeholder="Experience, specialties…" />
        <TextInput label="Years of experience" value={experience} onChangeText={(t) => setExperience(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="e.g. 5" />
        <TextInput label="City *" value={city} onChangeText={setCity} placeholder="e.g. Lahore" />
      </Card>

      <SectionHeader title="Services you offer *" />
      <Card>
        <View style={styles.chips}>
          {services.map((s) => (
            <Pressable key={s.id} onPress={() => toggle(serviceIds, s.id, setServiceIds)} style={[styles.chip, serviceIds.includes(s.id) && styles.chipActive]}>
              <Text style={[styles.chipText, serviceIds.includes(s.id) && styles.chipTextActive]}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
        {services.length === 0 ? <Text style={styles.meta}>No services configured yet — please try again later.</Text> : null}
      </Card>

      <SectionHeader title="Service areas *" />
      <Card>
        <View style={styles.chips}>
          {areas.map((a) => (
            <Pressable key={a.id} onPress={() => toggle(areaIds, a.id, setAreaIds)} style={[styles.chip, areaIds.includes(a.id) && styles.chipActive]}>
              <Text style={[styles.chipText, areaIds.includes(a.id) && styles.chipTextActive]}>{a.area_name}, {a.city}</Text>
            </Pressable>
          ))}
        </View>
        {areas.length === 0 ? <Text style={styles.meta}>No service areas configured yet.</Text> : null}
      </Card>

      <SectionHeader title="Verification documents *" />
      <Card>
        {DOC_TYPES.map((d) => (
          <View key={d.type} style={styles.docRow}>
            <View style={styles.docInfo}>
              <Text style={styles.docLabel}>{d.label}</Text>
              {docs[d.type] ? (
                <Image source={{ uri: docs[d.type].uri }} style={styles.docThumb} />
              ) : (
                <Text style={styles.meta}>Not uploaded</Text>
              )}
            </View>
            <Button title={docs[d.type] ? 'Replace' : 'Upload'} onPress={() => pickDoc(d.type)} variant="secondary" />
          </View>
        ))}
        <Text style={styles.fine}>Documents go to a private bucket — never a public URL — and are visible only to verification staff.</Text>
      </Card>

      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button title="Submit for verification" onPress={submit} loading={saving} style={styles.cta} />
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  inner: { padding: 16, paddingTop: 52 },
  back: { fontSize: 15, fontWeight: '600', color: C.primary, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: C.darkNavy },
  sub: { fontSize: 13, color: C.secondaryText, marginTop: 8, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: C.borderGray, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.pureWhite },
  chipActive: { borderColor: C.primary, backgroundColor: C.lightGreen },
  chipText: { fontSize: 13, fontWeight: '600', color: C.secondaryText },
  chipTextActive: { color: C.deepGreen },
  meta: { fontSize: 13, color: C.secondaryText, lineHeight: 19 },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.softGray },
  docInfo: { flex: 1, marginRight: 10 },
  docLabel: { fontSize: 14, fontWeight: '600', color: C.darkNavy },
  docThumb: { width: 64, height: 64, borderRadius: 8, marginTop: 6 },
  fine: { fontSize: 11, color: C.secondaryText, marginTop: 10, lineHeight: 16 },
  error: { fontSize: 13, color: C.error, marginTop: 12, lineHeight: 19 },
  cta: { marginTop: 16 },
});
