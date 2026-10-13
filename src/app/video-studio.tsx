import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import {
  AppText,
  Button,
  Card,
  ChoiceGroup,
  Icon,
  MockBanner,
  Screen,
  TextField,
} from '@/components/ui';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { ai, usingMockProvider } from '@/services/api';
import { useApp } from '@/store/AppContext';
import type {
  AspectRatio,
  SceneCount,
  SourceImage,
  VideoDuration,
  VideoStyle,
} from '@/types';
import { estimateVideoCost, formatCredits } from '@/utils/credits';
import { nowIso, titleFromPrompt } from '@/utils/format';

const STYLE_OPTIONS = [
  { value: 'cinematic' as VideoStyle, label: 'Cinematic' },
  { value: 'advertisement' as VideoStyle, label: 'Advertisement' },
  { value: 'documentary' as VideoStyle, label: 'Documentary' },
];

const DURATION_OPTIONS = [
  { value: 10 as VideoDuration, label: '10s' },
  { value: 15 as VideoDuration, label: '15s' },
  { value: 20 as VideoDuration, label: '20s' },
];

const SCENE_OPTIONS = [
  { value: 2 as SceneCount, label: '2 scenes' },
  { value: 3 as SceneCount, label: '3 scenes' },
  { value: 4 as SceneCount, label: '4 scenes' },
];

const ASPECT_OPTIONS = [
  { value: '16:9' as AspectRatio, label: '16:9' },
  { value: '9:16' as AspectRatio, label: '9:16' },
  { value: '1:1' as AspectRatio, label: '1:1' },
];

const PIPELINE = ['Idea', 'Script', 'Scene planning', 'References', 'Generation', 'Assembly'];

export default function VideoStudioScreen() {
  const { credits, spendCredits, refundCredits, addCreation } = useApp();
  const mock = usingMockProvider();

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<VideoStyle>('cinematic');
  const [duration, setDuration] = useState<VideoDuration>(10);
  const [sceneCount, setSceneCount] = useState<SceneCount>(2);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [characterDescription, setCharacterDescription] = useState('');
  const [reference, setReference] = useState<SourceImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const breakdown = useMemo(
    () => estimateVideoCost(duration, sceneCount, aspectRatio, style),
    [duration, sceneCount, aspectRatio, style]
  );

  const promptValid = prompt.trim().length >= 8;
  const canAfford = credits >= breakdown.total;

  const pickReference = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo permission is required to add a reference image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setReference({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
        fileName: asset.fileName ?? undefined,
      });
    }
  };

  const handleGenerate = async () => {
    if (!promptValid) {
      setError('Please describe your video in at least 8 characters.');
      return;
    }
    if (!canAfford) {
      setError('Not enough credits for this configuration.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const charged = spendCredits(breakdown.total, 'Video generation', mock);
    if (!charged) {
      setSubmitting(false);
      setError('Not enough credits for this configuration.');
      return;
    }

    try {
      const request = {
        prompt: prompt.trim(),
        style,
        durationSeconds: duration,
        sceneCount,
        aspectRatio,
        characterDescription: characterDescription.trim() || undefined,
        referenceImage: reference,
      };

      const job = await ai.createVideoJob(request);

      addCreation({
        kind: 'video',
        id: job.id,
        title: titleFromPrompt(request.prompt),
        createdAt: nowIso(),
        job,
      });

      router.replace({ pathname: '/video/[id]', params: { id: job.id } });
    } catch (err) {
      refundCredits(breakdown.total, 'Refund: video generation failed', mock);
      setError(
        err instanceof Error ? err.message : 'Could not start generation. Please try again.'
      );
      setSubmitting(false);
    }
  };

  return (
    <Screen withTabInset>
      <ScreenHeader title="AI Video Studio" subtitle="Prompt → Script → Scenes → Video" />

      {mock ? <MockBanner /> : null}

      <Card style={styles.pipelineCard}>
        <View style={styles.pipeline}>
          {PIPELINE.map((step, index) => (
            <View key={step} style={styles.pipelineStep}>
              <View style={styles.pipelineDot} />
              <AppText variant="tiny" color={Palette.textSecondary}>
                {step}
              </AppText>
              {index < PIPELINE.length - 1 ? <View style={styles.pipelineLine} /> : null}
            </View>
          ))}
        </View>
      </Card>

      <TextField
        label="Video prompt"
        placeholder="e.g. A drone shot over Zanzibar beaches at sunset, waves crashing, cinematic lighting"
        value={prompt}
        onChangeText={setPrompt}
        multiline
        numberOfLines={4}
        maxLength={600}
        hint={`${prompt.trim().length}/600 characters`}
        error={error && !promptValid ? 'Add a little more detail to your prompt.' : undefined}
      />

      <ChoiceGroup label="Style" options={STYLE_OPTIONS} value={style} onChange={setStyle} />
      <ChoiceGroup
        label="Duration"
        options={DURATION_OPTIONS}
        value={duration}
        onChange={setDuration}
        columns={3}
      />
      <ChoiceGroup
        label="Scenes"
        options={SCENE_OPTIONS}
        value={sceneCount}
        onChange={setSceneCount}
        columns={3}
      />
      <ChoiceGroup
        label="Aspect ratio"
        options={ASPECT_OPTIONS}
        value={aspectRatio}
        onChange={setAspectRatio}
        columns={3}
      />

      <TextField
        label="Character description (optional)"
        placeholder="Describe recurring characters to keep them consistent across scenes"
        value={characterDescription}
        onChangeText={setCharacterDescription}
        multiline
        numberOfLines={3}
        maxLength={300}
      />

      <View style={styles.referenceBlock}>
        <AppText variant="label" color={Palette.textSecondary}>
          Reference image (optional)
        </AppText>
        {reference ? (
          <View style={styles.referenceRow}>
            <Image source={{ uri: reference.uri }} style={styles.referenceImage} />
            <View style={styles.referenceText}>
              <AppText variant="small" color={Palette.textSecondary}>
                {reference.fileName ?? 'Selected image'}
              </AppText>
              <Button
                label="Remove"
                variant="ghost"
                size="sm"
                fullWidth={false}
                icon="close"
                onPress={() => setReference(null)}
              />
            </View>
          </View>
        ) : (
          <Button
            label="Add reference image"
            variant="secondary"
            icon="image-outline"
            onPress={pickReference}
          />
        )}
      </View>

      <Card style={styles.costCard}>
        <View style={styles.costHeader}>
          <AppText variant="label">Estimated cost</AppText>
          <AppText variant="title" color={Palette.primaryBright}>
            {formatCredits(breakdown.total)} cr
          </AppText>
        </View>
        <View style={styles.costBreakdown}>
          <CostLine label={`Base (${duration}s, ${sceneCount} scenes)`} value={breakdown.base} />
          {breakdown.duration > 0 ? (
            <CostLine label="Extra duration" value={breakdown.duration} />
          ) : null}
          {breakdown.scenes > 0 ? <CostLine label="Extra scenes" value={breakdown.scenes} /> : null}
          {breakdown.aspect > 0 ? (
            <CostLine label={`${aspectRatio} ratio`} value={breakdown.aspect} />
          ) : null}
        </View>
        <View style={styles.balanceRow}>
          <Icon
            name={canAfford ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={canAfford ? Palette.success : Palette.danger}
          />
          <AppText variant="small" color={canAfford ? Palette.textSecondary : Palette.danger}>
            Balance after: {formatCredits(Math.max(0, credits - breakdown.total))} cr (from{' '}
            {formatCredits(credits)})
          </AppText>
        </View>
        <AppText variant="tiny" color={Palette.textMuted}>
          Estimates only. The backend is the final authority on credits and billing.
        </AppText>
      </Card>

      {error && promptValid ? (
        <AppText variant="small" color={Palette.danger}>
          {error}
        </AppText>
      ) : null}

      <Button
        label="Generate Video"
        icon="sparkles"
        loading={submitting}
        disabled={!promptValid || !canAfford}
        onPress={handleGenerate}
      />

      <AppText variant="tiny" color={Palette.textMuted} center>
        {mock
          ? 'Mock mode: no external video provider is called and no real video is generated.'
          : 'Your request is sent to the Jay AI backend for processing.'}
      </AppText>
    </Screen>
  );
}

function CostLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.costLine}>
      <AppText variant="small" color={Palette.textSecondary}>
        {label}
      </AppText>
      <AppText variant="small">{formatCredits(value)} cr</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pipelineCard: {
    padding: Spacing.three,
  },
  pipeline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: Spacing.two,
  },
  pipelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pipelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.primaryBright,
  },
  pipelineLine: {
    width: 12,
    height: 1,
    backgroundColor: Palette.border,
    marginHorizontal: Spacing.one,
  },
  referenceBlock: {
    gap: Spacing.two,
  },
  referenceRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  referenceImage: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Palette.cardElevated,
  },
  referenceText: {
    flex: 1,
    gap: Spacing.one,
    alignItems: 'flex-start',
  },
  costCard: {
    gap: Spacing.two,
  },
  costHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  costBreakdown: {
    gap: Spacing.one,
  },
  costLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
