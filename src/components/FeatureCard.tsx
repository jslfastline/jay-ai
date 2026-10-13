import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { Gradients, Palette, Radius, Spacing } from '@/constants/theme';

import { AppText } from './ui/AppText';
import { Icon, type IconName } from './ui/Icon';

export interface FeatureCardProps {
  title: string;
  description: string;
  icon: IconName;
  onPress: () => void;
  /** The hero variant is used for the primary Video Studio feature. */
  hero?: boolean;
  badge?: string;
  disabled?: boolean;
}

/** Dashboard entry point card. The hero variant promotes Video Studio. */
export function FeatureCard({
  title,
  description,
  icon,
  onPress,
  hero = false,
  badge,
  disabled = false,
}: FeatureCardProps) {
  if (hero) {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${description}`}
        style={({ pressed }) => [pressed && { opacity: 0.94 }]}>
        <LinearGradient
          colors={Gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Icon name={icon} size={22} color={Palette.white} />
            </View>
            {badge ? (
              <View style={styles.heroBadge}>
                <AppText variant="tiny" color={Palette.white}>
                  {badge}
                </AppText>
              </View>
            ) : null}
          </View>
          <View style={styles.heroText}>
            <AppText variant="heading" color={Palette.white}>
              {title}
            </AppText>
            <AppText variant="small" color="rgba(255,255,255,0.85)">
              {description}
            </AppText>
          </View>
          <View style={styles.heroCta}>
            <AppText variant="label" color={Palette.white}>
              Open Studio
            </AppText>
            <Icon name="arrow-forward" size={16} color={Palette.white} />
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, disabled && { opacity: 0.5 }]}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={20} color={Palette.primaryBright} />
      </View>
      <View style={styles.text}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="small" color={Palette.textSecondary} numberOfLines={2}>
          {description}
        </AppText>
      </View>
      <Icon name="chevron-forward" size={18} color={Palette.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(56, 128, 248, 0.5)',
    shadowColor: Palette.primaryBright,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroBadge: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroText: {
    gap: Spacing.one,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  pressed: {
    opacity: 0.85,
    borderColor: 'rgba(56, 128, 248, 0.4)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
