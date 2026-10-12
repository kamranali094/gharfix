import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRAND } from '@gharfix/shared';
import { Button } from '../components/ui/Button';
import { LogoMark } from '../components/ui/Logo';

const C = BRAND.colors;
const { width } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Find trusted home-service professionals',
    body: 'Verified electricians, plumbers, AC technicians, cleaners and more — right in your city.',
  },
  {
    title: 'Book at a convenient time',
    body: 'Pick a time slot that suits you, or request service as soon as possible.',
  },
  {
    title: 'Track the service and rate the experience',
    body: 'Follow your booking live, pay securely, and rate the professional afterwards.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const finish = async () => {
    await AsyncStorage.setItem('gharfix_onboarded', '1');
    router.replace('/(auth)/phone');
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={finish} style={styles.skip} accessibilityRole="button" accessibilityLabel="Skip onboarding">
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <LogoMark size={84} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.footer}>
        <Button
          title={index === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={() => {
            if (index === SLIDES.length - 1) finish();
            else listRef.current?.scrollToIndex({ index: index + 1 });
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.warmWhite },
  skip: { alignSelf: 'flex-end', padding: 20 },
  skipText: { fontSize: 15, fontWeight: '600', color: C.primary },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 24, fontWeight: '800', color: C.darkNavy, textAlign: 'center', marginTop: 28, lineHeight: 32 },
  body: { fontSize: 15, color: C.secondaryText, textAlign: 'center', marginTop: 12, lineHeight: 23 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.borderGray, marginHorizontal: 4 },
  dotActive: { backgroundColor: C.primary, width: 24 },
  footer: { padding: 20 },
});
