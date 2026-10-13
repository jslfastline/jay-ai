import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  MockBanner,
  ProgressBar,
  Screen,
} from '@/components/ui';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { ai } from '@/services/api';
import { useApp } from '@/store/AppContext';
import type { VideoJob } from '@/types';
import { estimateVideoCost, formatCredits } from '@/utils/credits';
import { truncate } from '@/utils/format';

const ACTIVE_STATUSES: VideoJob['status'][] = ['queued', 'processing'];

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { creations, updateCreation, refundCredits } = useApp();

  const creation = creations.find((item) => item.id === id && item.kind === 'video');
  const initialJob = creation?.kind === 'video' ? creation.job : undefined;

  const [job, setJob] = useState<VideoJob | undefined>(initialJob);
  const [error, setError] = useState<string | null>(null);
  const refunded = useRef(false);

  const title = creation?.title ?? 'Video generation';

  const applyJob = useCallback(
    (next: VideoJob) => {
      setJob(next);
      updateCreation(next.id, (item) => (item.kind === 'video' ? { ...item, job: next } : item));
    },
    [updateCreation]
  );

  useEffect(() => {
    if (!id) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const next = await ai.getVideoJob(String(id));
        if (!active) return;
        applyJob(next);

        if (next.status === 'failed' && !refunded.current) {
          refunded.current = true;
          refundCredits(next.estimatedCredits, `Refund: ${truncate(title, 32)}`, next.mock);
        }

        if (ACTIVE_STATUSES.includes(next.status)) {
          timer = setTimeout(poll, 1500);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Lost connection to the job.');
      }
    };

    if (initialJob && ACTIVE_STATUSES.includes(initialJob.status)) {
      poll();
    } else if (!initialJob) {
      poll();
    }

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!creation && !job) {
    return (
      <Screen>
        <ScreenHeader title="Video" />
        <EmptyState
          icon="alert-circle-outline"
          title="Video not found"
          message="This generation is no longer available on this device."
          action={<Button label="Back to Tools" onPress={() => router.replace('/tools')} />}
        />
      </Screen>
    );
  }

  const active = job ? ACTIVE_STATUSES.includes(job.status) : false;
  const cost = job
    ? estimateVideoCost(
        job.request.durationSeconds,
        job.request.sceneCount,
        job.request.aspectRatio,
        job.request.style
      )
    : undefined;

  return (
    <Screen withTabInset>
      <ScreenHeader title="Generating" subtitle={truncate(job?.request.prompt ?? title, 48)} />

      {job?.mock ? <MockBanner compact message="Mock job — simulated locally. No real video is produced." /> : null}

      <Card glow={active} style={styles.statusCard}>
        <View style={styles.statusHead}>
          {job ? <Badge status={job.status} /> : null}
          {job?.mock ? <Badge tone="mock" /> : null}
        </View>

        {active ? (
          <>
            <View style={styles.progressHeader}>
              <AppText variant="label">{job?.stage ?? 'Starting…'}</AppText>
              <AppText variant="label" color={Palette.primaryBright}>
                {Math.round((job?.progress ?? 0) * 100)}%
              </AppText>
            </View>
            <ProgressBar value={job?.progress ?? 0} />
            <View style={styles.waiting}>
              <ActivityIndicator color={Palette.primaryBright} />
              <AppText variant="small" color={Palette.textSecondary}>
                This usually takes a moment. Keep the app open.
              </AppText>
            </View>
          </>
        ) : job?.status === 'failed' ? (
          <View style={styles.failBody}>
            <Icon name="alert-circle" size={22} color={Palette.danger} />
            <AppText variant="small" color={Palette.danger}>
              {job.error ?? 'Generation failed. Any reserved credits were refunded.'}
            </AppText>
            <Button
              label="Try again"
              variant="secondary"
              icon="refresh"
              onPress={() => router.replace('/video-studio')}
            />
          </View>
        ) : (
          <View style={styles.readyBody}>
            <Icon name="checkmark-circle" size={22} color={Palette.success} />
            <AppText variant="body">Generation complete</AppText>
          </View>
        )}
      </Card>

      {job?.status === 'completed' ? (
        job.videoUrl ? (
          <VideoResult url={job.videoUrl} title={title} />
        ) : (
          <Card style={styles.noticeCard}>
            <Icon name="information-circle-outline" size={20} color={Palette.textSecondary} />
            <AppText variant="small" color={Palette.textSecondary}>
              No playable video URL was returned. In mock mode nothing was generated — connect a real
              backend to render an actual video.
            </AppText>
          </Card>
        )
      ) : null}

      {error ? (
        <AppText variant="small" color={Palette.danger}>
          {error}
        </AppText>
      ) : null}

      {job ? (
        <Card style={styles.detailsCard}>
          <AppText variant="label">Job details</AppText>
          <Detail label="Job ID" value={job.id} />
          <Detail
            label="Configuration"
            value={`${job.request.style} · ${job.request.durationSeconds}s · ${job.request.sceneCount} scenes · ${job.request.aspectRatio}`}
          />
          {cost ? <Detail label="Estimated cost" value={`${formatCredits(cost.total)} cr`} /> : null}
          {job.request.characterDescription ? (
            <Detail label="Characters" value={job.request.characterDescription} />
          ) : null}
        </Card>
      ) : null}

      <Button
        label="New video"
        variant="secondary"
        icon="add"
        onPress={() => router.replace('/video-studio')}
      />
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="small" color={Palette.textMuted}>
        {label}
      </AppText>
      <AppText variant="small" style={styles.detailValue} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

function VideoResult({ url, title }: { url: string; title: string }) {
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const player = useVideoPlayer({ uri: url }, (instance) => {
    instance.loop = true;
  });

  const handleDownload = async () => {
    setSharing(true);
    setMessage(null);
    try {
      const target = `${FileSystem.cacheDirectory ?? ''}jay-${Date.now()}.mp4`;
      const result = await FileSystem.downloadAsync(url, target);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'video/mp4',
          dialogTitle: title,
        });
      } else {
        setMessage('Sharing is not available on this device.');
      }
    } catch {
      setMessage('Could not download the video. Check your connection.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card style={styles.resultCard}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        contentFit="contain"
      />
      <View style={styles.resultActions}>
        <Button
          label="Save / Share"
          icon="share-outline"
          loading={sharing}
          onPress={handleDownload}
          style={styles.flex}
        />
      </View>
      {message ? (
        <AppText variant="small" color={Palette.textSecondary}>
          {message}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    gap: Spacing.three,
  },
  statusHead: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  failBody: {
    gap: Spacing.three,
  },
  readyBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  resultCard: {
    gap: Spacing.three,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    backgroundColor: Palette.black,
  },
  resultActions: {
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  detailsCard: {
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
  },
});
