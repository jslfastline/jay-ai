import { Pressable, StyleSheet, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';
import { formatCredits } from '@/utils/credits';

import { AppText } from './AppText';
import { Icon } from './Icon';

export interface CreditPillProps {
  credits: number;
  onPress?: () => void;
}

/** Compact credits balance chip for headers. */
export function CreditPill({ credits, onPress }: CreditPillProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatCredits(credits)} credits. View credits.`}
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.8 }]}>
      <Icon name="flash" size={14} color={Palette.primaryBright} />
      <View>
        <AppText variant="tiny" color={Palette.textMuted}>
          CREDITS
        </AppText>
        <AppText variant="label">{formatCredits(credits)}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(56, 128, 248, 0.35)',
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
  },
});
