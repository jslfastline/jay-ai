import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';
import type { VideoJob } from '@/types';
import { formatRelativeTime, truncate } from '@/utils/format';

import { AppText } from './ui/AppText';
import { Badge } from './ui/Badge';
import { Icon } from './ui/Icon';
import { ProgressBar } from './ui/ProgressBar';

export interface VideoCardProps {
  job: VideoJob;
  onPress: (job: VideoJob) => void;
}

const STYLE_LABELS: Record<string, string> = {
  cinematic: 'Cinematic',
  advertisement: 'Advertisement',
  documentary: 'Documentary',
};

/** List item representing a video job in "My Videos". */
export function VideoCard({ job, onPress }: VideoCardProps) {
  const hasPlayableResult = job.status === 'completed' && Boolean(job.videoUrl);

  return (
    <Pressable
      onPress={() => onPress(job)}
      accessibilityRole="button"
      accessibilityLabel={`Video: ${truncate(job.request.prompt, 60)}. Status ${job.status}.`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.thumb}>
        {job.thumbnailUrl ? (
          <Image source={{ uri: job.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Icon
            name="video"
            size={30}
            color={hasPlayableResult ? Palette.primaryBright : Palette.textMuted}
          />
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.rowBetween}>
          <AppText variant="label" numberOfLines={1} style={styles.title}>
            {truncate(job.request.prompt, 42)}
          </AppText>
          <Badge status={job.status} />
        </View>
        <AppText variant="small" color={Palette.textSecondary}>
          {STYLE_LABELS[job.request.style] ?? job.request.style} · {job.request.durationSeconds}s ·{' '}
          {job.request.sceneCount} scenes
        </AppText>
        {job.status === 'processing' || job.status === 'queued' ? (
          <View style={styles.progress}>
            <ProgressBar value={job.progress} />
            <AppText variant="tiny" color={Palette.textMuted}>
              {job.stage}
            </AppText>
          </View>
        ) : (
          <AppText variant="tiny" color={Palette.textMuted}>
            {formatRelativeTime(job.createdAt)}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    gap: Spacing.one,
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  progress: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
});
