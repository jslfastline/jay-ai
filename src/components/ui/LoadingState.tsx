import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

export interface LoadingStateProps {
  title?: string;
  message?: string;
}

/** Centered loading indicator with a status label. */
export function LoadingState({ title = 'Loading', message }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Palette.primaryBright} />
      <AppText variant="label">{title}</AppText>
      {message ? (
        <AppText variant="small" color={Palette.textSecondary} center>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
});
