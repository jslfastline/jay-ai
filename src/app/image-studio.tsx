import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import {
  AppText,
  Button,
  Card,
  ChoiceGroup,
  EmptyState,
  Icon,
  LoadingState,
  MockBanner,
  Screen,
  TextField,
} from '@/components/ui';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { ai, usingMockProvider } from '@/services/api';
import { useApp } from '@/store/AppContext';
import type { AspectRatio, ImageRequest, ImageResult, ImageStyle } from '@/types';
import { estimateImageRequestCredits, formatCredits } from '@/utils/credits';
import { titleFromPrompt } from '@/utils/format';

const STYLE_OPTIONS = [
  { value: 'realistic' as ImageStyle, label: 'Realistic' },
  { value: 'cinematic' as ImageStyle, label: 'Cinematic' },
  { value: 'anime' as ImageStyle, label: 'Anime' },
  { value: 'digital-art' as ImageStyle, label: 'Digital Art' },
  { value: '3d-render' as ImageStyle, label: '3D Render' },
];

const ASPECT_OPTIONS = [
  { value: '1:1' as AspectRatio, label: '1:1' },
  { value: '16:9' as AspectRatio, label: '16:9' },
  { value: '9:16' as AspectRatio, label: '9:16' },
];

export default function ImageStudioScreen() {
  const { credits, spendCredits, refundCredits, addCreation } = useApp();
  const mock = usingMockProvider();

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<ImageStyle>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [result, setResult] = useState<ImageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request: ImageRequest = useMemo(
    () => ({ prompt: prompt.trim(), style, aspectRatio, count: 1 }),
    [prompt, style, aspectRatio]
  );
  const cost = estimateImageRequestCredits(request);
  const promptValid = prompt.trim().length >= 4;
  const canAfford = credits >= cost;

  const generate = async () => {
    if (!promptValid) {
      setError('Describe the image you want in at least 4 characters.');
      return;
    }
    if (!canAfford) {
      setError('Not enough credits for this image.');
      return;
    }
    if (!spendCredits(cost, 'Image generation', mock)) {
      setError('Not enough credits for this image.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const image = await ai.generateImage(request);
      setResult(image);
      addCreation({
        kind: 'image',
        id: image.id,
        title: titleFromPrompt(request.prompt),
        createdAt: image.createdAt,
        image,
      });
    } catch (err) {
      refundCredits(cost, 'Refund: image generation failed', mock);
      setError(err instanceof Error ? err.message : 'Image generation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen withTabInset>
      <ScreenHeader title="AI Image Studio" subtitle="Prompt → Style → Render" />

      {mock ? <MockBanner /> : null}

      <TextField
        label="Image prompt"
        placeholder="e.g. A futuristic Dar es Salaam skyline at night, neon reflections, ultra detailed"
        value={prompt}
        onChangeText={setPrompt}
        multiline
        numberOfLines={4}
        maxLength={500}
        hint={`${prompt.trim().length}/500 characters`}
      />

      <ChoiceGroup label="Style" options={STYLE_OPTIONS} value={style} onChange={setStyle} />
      <ChoiceGroup
        label="Aspect ratio"
        options={ASPECT_OPTIONS}
        value={aspectRatio}
        onChange={setAspectRatio}
        columns={3}
      />

      <Card style={styles.costRow}>
        <Icon name="flash-outline" size={16} color={Palette.primaryBright} />
        <AppText variant="small" color={Palette.textSecondary}>
          Estimated cost
        </AppText>
        <AppText variant="label" color={Palette.primaryBright}>
          {formatCredits(cost)} cr
        </AppText>
      </Card>

      {error ? (
        <AppText variant="small" color={Palette.danger}>
          {error}
        </AppText>
      ) : null}

      <Button
        label="Generate Image"
        icon="image"
        loading={loading}
        disabled={!promptValid || !canAfford}
        onPress={generate}
      />

      {loading ? <LoadingState title="Rendering image…" /> : null}

      {!loading && result ? (
        result.status === 'failed' ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Generation failed"
            message={result.error ?? 'Please try again.'}
          />
        ) : result.images.length > 0 ? (
          <View style={styles.resultBlock}>
            <View style={styles.resultHeader}>
              <AppText variant="label">Result</AppText>
              {result.mock ? (
                <AppText variant="tiny" color={Palette.warning}>
                  Placeholder (mock)
                </AppText>
              ) : null}
            </View>
            <Image
              source={{ uri: result.images[0] }}
              style={styles.image}
              contentFit="cover"
              transition={250}
              accessibilityLabel="Generated image result"
            />
            <AppText variant="tiny" color={Palette.textMuted}>
              Saved to My Creations.
            </AppText>
          </View>
        ) : (
          <EmptyState
            icon="image-outline"
            title="No image returned"
            message={result.error ?? 'The provider returned no image.'}
          />
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  resultBlock: {
    gap: Spacing.two,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    backgroundColor: Palette.cardElevated,
  },
});
