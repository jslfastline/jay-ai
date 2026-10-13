import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  /** Optional accessory rendered on the right (e.g. a picker button). */
  accessory?: React.ReactNode;
}

/** Labelled text input with helper + error messaging. */
export function TextField({ label, hint, error, accessory, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="label" color={Palette.textSecondary}>
          {label}
        </AppText>
      ) : null}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          {...rest}
          placeholderTextColor={Palette.textMuted}
          selectionColor={Palette.primaryBright}
          style={[styles.input, rest.multiline ? styles.multiline : null, style]}
        />
        {accessory}
      </View>
      {error ? (
        <AppText variant="small" color={Palette.danger}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" color={Palette.textMuted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  inputError: {
    borderColor: Palette.danger,
  },
  input: {
    flex: 1,
    color: Palette.text,
    ...Typography.body,
    paddingVertical: Spacing.three,
    minHeight: 50,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
    paddingTop: Spacing.three,
  },
});
