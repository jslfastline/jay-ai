import { StyleSheet, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';
import type { JobStatus } from '@/types';

import { AppText } from './AppText';

const STATUS_STYLES: Record<JobStatus | 'mock', { label: string; color: string; bg: string }> = {
  queued: { label: 'Queued', color: Palette.info, bg: 'rgba(96, 165, 250, 0.15)' },
  processing: { label: 'Processing', color: Palette.warning, bg: 'rgba(245, 158, 11, 0.15)' },
  completed: { label: 'Completed', color: Palette.success, bg: 'rgba(52, 211, 153, 0.15)' },
  failed: { label: 'Failed', color: Palette.danger, bg: 'rgba(248, 113, 113, 0.15)' },
  mock: { label: 'Mock', color: Palette.warning, bg: 'rgba(245, 158, 11, 0.15)' },
};

export interface BadgeProps {
  status?: JobStatus;
  label?: string;
  tone?: 'mock' | 'info' | 'neutral';
}

/** Status badge used for jobs and mock indicators. */
export function Badge({ status, label, tone }: BadgeProps) {
  const key: keyof typeof STATUS_STYLES = status ?? (tone === 'mock' ? 'mock' : 'queued');
  const preset = STATUS_STYLES[key];
  const resolvedLabel = label ?? preset.label;

  return (
    <View style={[styles.badge, { backgroundColor: preset.bg, borderColor: preset.color }]}>
      <View style={[styles.dot, { backgroundColor: preset.color }]} />
      <AppText variant="tiny" color={preset.color}>
        {resolvedLabel}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
