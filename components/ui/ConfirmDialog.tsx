import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { BRAND } from '@gharfix/shared';
import { Button } from './Button';

const C = BRAND.colors;

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmTitle = 'Confirm',
  cancelTitle = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmTitle?: string;
  cancelTitle?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button title={cancelTitle} onPress={onCancel} variant="secondary" style={styles.action} disabled={loading} />
            <Button
              title={confirmTitle}
              onPress={onConfirm}
              variant={destructive ? 'danger' : 'primary'}
              style={styles.action}
              loading={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: C.pureWhite, borderRadius: 16, padding: 20, width: '100%' },
  title: { fontSize: 17, fontWeight: '700', color: C.darkNavy, marginBottom: 8 },
  message: { fontSize: 14, color: C.secondaryText, lineHeight: 21, marginBottom: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
});
