import { StyleSheet, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

/** Friendly placeholder for empty lists. */
export function EmptyState({ icon = 'sparkles-outline', title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={28} color={Palette.primaryBright} />
      </View>
      <AppText variant="heading" center>
        {title}
      </AppText>
      {message ? (
        <AppText variant="small" color={Palette.textSecondary} center>
          {message}
        </AppText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 128, 248, 0.3)',
    marginBottom: Spacing.two,
  },
  action: {
    marginTop: Spacing.three,
    alignSelf: 'stretch',
  },
});
