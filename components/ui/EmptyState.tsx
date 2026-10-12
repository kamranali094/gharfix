import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BRAND } from '@gharfix/shared';
import { Button } from './Button';

const C = BRAND.colors;

export function EmptyState({
  title,
  message,
  actionTitle,
  onAction,
}: {
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>◌</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} variant="secondary" style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.softGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: { fontSize: 28, color: C.secondaryText },
  title: { fontSize: 16, fontWeight: '700', color: C.darkNavy, marginBottom: 6, textAlign: 'center' },
  message: { fontSize: 13, color: C.secondaryText, textAlign: 'center', lineHeight: 20 },
  button: { marginTop: 14 },
});
