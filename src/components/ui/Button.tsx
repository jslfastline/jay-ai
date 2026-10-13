import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Gradients, Palette, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const HEIGHTS: Record<ButtonSize, number> = { sm: 40, md: 50, lg: 58 };

/** Accessible action button with loading + disabled states. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  accessibilityHint,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const height = HEIGHTS[size];

  const textColor =
    variant === 'primary'
      ? Palette.white
      : variant === 'danger'
        ? Palette.danger
        : variant === 'secondary'
          ? Palette.text
          : Palette.primaryBright;

  const inner = (
    <View style={[styles.row, { height }]}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        icon && <Icon name={icon} size={18} color={textColor} />
      )}
      <AppText variant="label" color={textColor}>
        {label}
      </AppText>
    </View>
  );

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
      style={({ pressed }) => [
        { opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={Gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}>
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.outline,
            variant === 'danger' && styles.danger,
            variant === 'ghost' && styles.ghost,
          ]}>
          {inner}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  gradient: {
    borderRadius: Radius.md,
  },
  outline: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  danger: {
    borderColor: 'rgba(248, 113, 113, 0.5)',
  },
  ghost: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
