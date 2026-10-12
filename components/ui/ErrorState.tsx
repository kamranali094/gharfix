import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BRAND } from '@gharfix/shared';
import { Button } from './Button';

const C = BRAND.colors;

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>!</Text>
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button title="Retry" onPress={onRetry} variant="secondary" style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: { fontSize: 24, fontWeight: '700', color: C.error },
  title: { fontSize: 16, fontWeight: '700', color: C.darkNavy, marginBottom: 6 },
  message: { fontSize: 13, color: C.secondaryText, textAlign: 'center', lineHeight: 20 },
  button: { marginTop: 14 },
});
