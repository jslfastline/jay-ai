import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';
import type { Creation, JobStatus } from '@/types';
import { formatRelativeTime, truncate } from '@/utils/format';

import { AppText } from './ui/AppText';
import { Badge } from './ui/Badge';
import { Icon, type IconName } from './ui/Icon';

export interface CreationCardProps {
  creation: Creation;
  onPress: (creation: Creation) => void;
  onDelete?: (creation: Creation) => void;
}

function statusOf(creation: Creation): JobStatus | undefined {
  if (creation.kind === 'video') return creation.job.status;
  if (creation.kind === 'image') return creation.image.status;
  return undefined;
}

/** Generic list row for the unified My Creations feed. */
export function CreationCard({ creation, onPress, onDelete }: CreationCardProps) {
  const icon: IconName =
    creation.kind === 'video'
      ? 'video'
      : creation.kind === 'image'
        ? 'image'
        : creation.kind === 'chat'
          ? 'chatbubbles'
          : 'scan';

  const status = statusOf(creation);
  const isMock =
    creation.kind === 'video'
      ? creation.job.mock
      : creation.kind === 'image'
        ? creation.image.mock
        : creation.kind === 'analysis'
          ? creation.analysis.mock
          : creation.messages.some((message) => message.mock);
  const previewUri =
    creation.kind === 'image' && creation.image.images.length > 0
      ? creation.image.images[0]
      : creation.kind === 'video'
        ? creation.job.thumbnailUrl
        : creation.kind === 'analysis'
          ? creation.analysis.imageUri
          : undefined;

  return (
    <Pressable
      onPress={() => onPress(creation)}
      accessibilityRole="button"
      accessibilityLabel={`${creation.kind}: ${creation.title}. ${status ?? 'completed'}.`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.thumb}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Icon name={icon} size={24} color={Palette.primaryBright} />
        )}
      </View>
      <View style={styles.body}>
        <AppText variant="label" numberOfLines={1}>
          {truncate(creation.title, 40)}
        </AppText>
        <View style={styles.meta}>
          {status ? <Badge status={status} /> : <Badge label="Chat" tone="info" />}
          {isMock ? <Badge tone="mock" /> : null}
        </View>
        <AppText variant="tiny" color={Palette.textMuted}>
          {formatRelativeTime(creation.createdAt)}
        </AppText>
      </View>
      {onDelete ? (
        <Pressable
          onPress={() => onDelete(creation)}
          accessibilityRole="button"
          accessibilityLabel="Delete creation"
          hitSlop={10}
          style={styles.delete}>
          <Icon name="trash-outline" size={18} color={Palette.textMuted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  meta: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  delete: {
    padding: Spacing.two,
  },
});
