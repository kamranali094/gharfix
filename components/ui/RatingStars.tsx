import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BRAND } from '@gharfix/shared';

const C = BRAND.colors;

export function RatingStars({ rating, size = 16, showValue = false }: { rating: number; size?: number; showValue?: boolean }) {
  const full = Math.round(rating);
  return (
    <View style={styles.row} accessibilityLabel={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={[styles.star, { fontSize: size, color: i <= full ? '#F59E0B' : C.borderGray }]}>
          ★
        </Text>
      ))}
      {showValue ? <Text style={[styles.value, { fontSize: size - 2 }]}>{rating.toFixed(1)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  star: { marginRight: 1 },
  value: { color: C.secondaryText, fontWeight: '600', marginLeft: 4 },
});
