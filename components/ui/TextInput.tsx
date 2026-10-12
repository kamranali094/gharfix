import React, { useState } from 'react';
import { View, Text, TextInput as RNTextInput, StyleSheet, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { BRAND } from '@gharfix/shared';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  hint?: string;
}

const C = BRAND.colors;

export function TextInput({ label, error, containerStyle, hint, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <RNTextInput
        style={[styles.input, focused && styles.inputFocused, error ? styles.inputError : null]}
        placeholderTextColor={C.secondaryText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: C.darkNavy, marginBottom: 6 },
  input: {
    backgroundColor: C.pureWhite,
    borderWidth: 1.5,
    borderColor: C.borderGray,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.darkNavy,
    minHeight: 50,
  },
  inputFocused: { borderColor: C.primary },
  inputError: { borderColor: C.error },
  error: { fontSize: 12, color: C.error, marginTop: 4 },
  hint: { fontSize: 12, color: C.secondaryText, marginTop: 4 },
});
