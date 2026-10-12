import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { BRAND } from '@gharfix/shared';

const C = BRAND.colors;

/** Static skeleton blocks shown while list content loads. */
export function LoadingSkeleton({ count = 3, style }: { count?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} accessibilityLabel="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.block}>
          <View style={styles.line} />
          <View style={[styles.line, styles.short]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: C.pureWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderGray,
    padding: 14,
    marginBottom: 10,
  },
  line: { height: 14, borderRadius: 7, backgroundColor: C.softGray, marginBottom: 8 },
  short: { width: '55%' },
});
