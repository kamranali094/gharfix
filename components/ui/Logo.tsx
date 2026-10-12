import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { BRAND } from '@gharfix/shared';

const C = BRAND.colors;

/**
 * GharFix logo: a home outline with a checkmark (repair-done) inside.
 * Works on white and green backgrounds; recognizable at small sizes.
 */
export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="GharFix logo">
      <Rect x="2" y="2" width="60" height="60" rx="14" fill={C.primary} />
      <Path
        d="M32 13 L48 26 H43.5 V46 H36.5 V37 H27.5 V46 H20.5 V26 H16 Z"
        fill="none"
        stroke={C.pureWhite}
        strokeWidth={3.6}
        strokeLinejoin="round"
      />
      <Path
        d="M27 29.5 L31.5 34 L37.5 26.5"
        fill="none"
        stroke={C.pureWhite}
        strokeWidth={3.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LogoHorizontal({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <LogoMark size={size} />
      <Text style={[styles.wordmark, { fontSize: size * 0.55 }]}>GharFix</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { fontWeight: '800', color: C.darkNavy, marginLeft: 10, letterSpacing: 0.5 },
});
