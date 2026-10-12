import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { BRAND, BOOKING_STATUS_LABELS, type BookingStatus } from '@gharfix/shared';

const C = BRAND.colors;

/** Status badge: always shows a text label, never color alone. */
const STATUS_STYLES: Record<string, { bg: string; fg: string; border: string }> = {
  pending: { bg: '#FEF3C7', fg: '#92400E', border: '#FDE68A' },
  accepted: { bg: '#DBEAFE', fg: '#1E40AF', border: '#BFDBFE' },
  provider_assigned: { bg: '#DBEAFE', fg: '#1E40AF', border: '#BFDBFE' },
  on_the_way: { bg: '#E0E7FF', fg: '#3730A3', border: '#C7D2FE' },
  arrived: { bg: '#E0E7FF', fg: '#3730A3', border: '#C7D2FE' },
  in_progress: { bg: C.lightGreen, fg: C.deepGreen, border: '#A7F3D0' },
  awaiting_quote_approval: { bg: '#FEF3C7', fg: '#92400E', border: '#FDE68A' },
  completed: { bg: '#D1FAE5', fg: C.success, border: '#A7F3D0' },
  cancelled: { bg: C.softGray, fg: C.secondaryText, border: C.borderGray },
  disputed: { bg: '#FEE2E2', fg: C.error, border: '#FECACA' },
  // verification + payment + misc
  approved: { bg: '#D1FAE5', fg: C.success, border: '#A7F3D0' },
  verified: { bg: '#D1FAE5', fg: C.success, border: '#A7F3D0' },
  paid: { bg: '#D1FAE5', fg: C.success, border: '#A7F3D0' },
  unpaid: { bg: C.softGray, fg: C.secondaryText, border: C.borderGray },
  pending_verification: { bg: '#FEF3C7', fg: '#92400E', border: '#FDE68A' },
  under_review: { bg: '#FEF3C7', fg: '#92400E', border: '#FDE68A' },
  rejected: { bg: '#FEE2E2', fg: C.error, border: '#FECACA' },
  suspended: { bg: '#FEE2E2', fg: C.error, border: '#FECACA' },
  open: { bg: '#DBEAFE', fg: '#1E40AF', border: '#BFDBFE' },
  resolved: { bg: '#D1FAE5', fg: C.success, border: '#A7F3D0' },
  closed: { bg: C.softGray, fg: C.secondaryText, border: C.borderGray },
};

export function Badge({ status, style }: { status: string; style?: StyleProp<ViewStyle> }) {
  const s = STATUS_STYLES[status] ?? { bg: C.softGray, fg: C.secondaryText, border: C.borderGray };
  const label =
    (BOOKING_STATUS_LABELS as Record<string, string>)[status] ??
    status.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }, style]} accessibilityLabel={`Status: ${label}`}>
      <View style={[styles.dot, { backgroundColor: s.fg }]} />
      <Text style={[styles.text, { color: s.fg }]}>{label}</Text>
    </View>
  );
}

/** Convenience wrapper typed for booking statuses. */
export function BookingBadge({ status, style }: { status: BookingStatus; style?: StyleProp<ViewStyle> }) {
  return <Badge status={status} style={style} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  text: { fontSize: 12, fontWeight: '600' },
});
