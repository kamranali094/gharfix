import React from 'react';
import { View, TextInput as RNTextInput, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { BRAND } from '@gharfix/shared';

const C = BRAND.colors;

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search…',
  onSubmit,
  style,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.wrap, style]}>
      <RNTextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.secondaryText}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        accessibilityLabel={placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.pureWhite,
    borderWidth: 1.5,
    borderColor: C.borderGray,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: { minHeight: 48, fontSize: 15, color: C.darkNavy },
});
