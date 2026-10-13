import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';

import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';
import { Logo } from './ui/Logo';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Show a back button (default true). */
  showBack?: boolean;
  /** Show the brand logo instead of a back button. */
  showLogo?: boolean;
  right?: React.ReactNode;
}

/** Header used on stacked screens. */
export function ScreenHeader({ title, subtitle, showBack = true, showLogo, right }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showLogo ? (
          <Logo size={36} />
        ) : showBack ? (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}>
            <Icon name="chevron-back" size={22} color={Palette.text} />
          </Pressable>
        ) : null}
        <View style={styles.titles}>
          <AppText variant="heading" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="tiny" color={Palette.textMuted} numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: Palette.border,
  },
});
