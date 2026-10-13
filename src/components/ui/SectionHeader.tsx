import { StyleSheet, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

export interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  subtitle?: string;
}

/** Title row with an optional trailing action. */
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="heading">{title}</AppText>
        {subtitle ? (
          <AppText variant="small" color={Palette.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
