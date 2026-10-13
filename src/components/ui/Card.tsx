import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { Gradients, Palette, Radius, Spacing } from '@/constants/theme';

export interface CardProps extends ViewProps {
  /** Render a subtle brand gradient border/glow. */
  glow?: boolean;
  /** Fill the card with a soft brand gradient instead of a flat surface. */
  gradient?: boolean;
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/** Rounded surface used across the app. */
export function Card({ glow, gradient, padded = true, style, children, ...rest }: CardProps) {
  const content = (
    <View style={[padded && styles.padded, styles.inner, style]} {...rest}>
      {children}
    </View>
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={Gradients.brandSoft}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, glow && styles.glow]}>
        {content}
      </LinearGradient>
    );
  }

  return <View style={[styles.card, glow && styles.glow]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  inner: {
    borderRadius: Radius.lg,
    gap: Spacing.two,
  },
  padded: {
    padding: Spacing.three,
  },
  glow: {
    borderColor: 'rgba(56, 128, 248, 0.35)',
    shadowColor: Palette.primaryBright,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
