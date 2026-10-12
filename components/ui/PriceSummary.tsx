import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BRAND, formatPKR, type PriceSnapshot } from '@gharfix/shared';

const C = BRAND.colors;

export function PriceRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.value, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

export function PriceSummary({ snapshot }: { snapshot: PriceSnapshot }) {
  return (
    <View>
      <PriceRow label="Labour" value={formatPKR(snapshot.labour)} />
      {snapshot.materials > 0 ? <PriceRow label="Materials" value={formatPKR(snapshot.materials)} /> : null}
      {snapshot.inspection_fee > 0 ? <PriceRow label="Inspection fee" value={formatPKR(snapshot.inspection_fee)} /> : null}
      {snapshot.service_fee > 0 ? <PriceRow label="Service fee" value={formatPKR(snapshot.service_fee)} /> : null}
      {snapshot.discount > 0 ? <PriceRow label="Discount" value={`− ${formatPKR(snapshot.discount)}`} /> : null}
      <View style={styles.divider} />
      <PriceRow label="Total estimate" value={formatPKR(snapshot.total)} bold />
      {snapshot.pricing_model === 'quotation' ? (
        <Text style={styles.notice}>
          Quotation-based service: the final price depends on inspection. The provider will submit an itemized quote for
          your approval before chargeable work begins.
        </Text>
      ) : null}
      {snapshot.note ? <Text style={styles.note}>{snapshot.note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  label: { fontSize: 14, color: C.secondaryText },
  value: { fontSize: 14, color: C.darkNavy, fontWeight: '500' },
  bold: { fontWeight: '700', color: C.darkNavy, fontSize: 16 },
  divider: { height: 1, backgroundColor: C.borderGray, marginVertical: 8 },
  notice: {
    marginTop: 10,
    fontSize: 12,
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    lineHeight: 18,
  },
  note: { marginTop: 8, fontSize: 12, color: C.secondaryText, fontStyle: 'italic' },
});
