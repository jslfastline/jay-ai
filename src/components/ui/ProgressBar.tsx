import { StyleSheet, View } from 'react-native';

import { Palette, Radius } from '@/constants/theme';

export interface ProgressBarProps {
  /** 0..1 */
  value: number;
}

/** Gradient progress indicator. */
export function ProgressBar({ value }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Palette.primaryBright,
  },
});
