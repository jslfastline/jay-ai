import { StyleSheet, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

export interface MockBannerProps {
  message?: string;
  compact?: boolean;
}

/** Persistent, explicit notice that content is simulated during development. */
export function MockBanner({ message, compact }: MockBannerProps) {
  return (
    <View style={[styles.banner, compact && styles.compact]}>
      <Icon name="info" size={16} color={Palette.warning} />
      <AppText variant="small" color={Palette.warning} style={styles.text}>
        {message ??
          'Development mock mode — responses are simulated, not real AI output. Add a backend URL to go live.'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  compact: {
    paddingVertical: Spacing.two,
  },
  text: {
    flex: 1,
  },
});
