import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BRAND } from '@gharfix/shared';

const C = BRAND.colors;

export function SectionHeader({
  title,
  actionTitle,
  onAction,
}: {
  title: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionTitle && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionTitle}>
          <Text style={styles.action}>{actionTitle}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 18 },
  title: { fontSize: 18, fontWeight: '700', color: C.darkNavy },
  action: { fontSize: 14, fontWeight: '600', color: C.primary },
});
