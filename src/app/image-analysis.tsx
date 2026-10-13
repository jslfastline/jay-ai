import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import {
  AppText,
  Button,
  Card,
  Icon,
  LoadingState,
  MockBanner,
  Screen,
  TextField,
} from '@/components/ui';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { ai, usingMockProvider } from '@/services/api';
import { useApp } from '@/store/AppContext';
import type { AnalysisResult, SourceImage } from '@/types';
import { titleFromPrompt } from '@/utils/format';

export default function ImageAnalysisScreen() {
  const { addCreation } = useApp();
  const mock = usingMockProvider();

  const [image, setImage] = useState<SourceImage | null>(null);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFromLibrary = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo permission is required to analyze an image.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!picked.canceled && picked.assets[0]) {
      const asset = picked.assets[0];
      setImage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
        fileName: asset.fileName ?? undefined,
      });
      setResult(null);
    }
  };

  const takePhoto = async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to capture an image.');
      return;
    }
    const captured = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (!captured.canceled && captured.assets[0]) {
      const asset = captured.assets[0];
      setImage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
        fileName: asset.fileName ?? undefined,
      });
      setResult(null);
    }
  };

  const analyze = async () => {
    if (!image) {
      setError('Select an image first.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await ai.analyzeImage(image, question.trim());
      setResult(analysis);
      addCreation({
        kind: 'analysis',
        id: analysis.id,
        title: titleFromPrompt(question || 'Image analysis'),
        createdAt: analysis.createdAt,
        analysis,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen withTabInset>
      <ScreenHeader title="AI Image Analysis" subtitle="Pick an image and ask a question" />

      {mock ? <MockBanner /> : null}

      {image ? (
        <View style={styles.previewBlock}>
          <Image
            source={{ uri: image.uri }}
            style={styles.preview}
            contentFit="contain"
            transition={200}
            accessibilityLabel="Selected image preview"
          />
          <Button
            label="Choose a different image"
            variant="secondary"
            size="sm"
            icon="swap-horizontal"
            onPress={pickFromLibrary}
          />
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Icon name="scan-outline" size={30} color={Palette.primaryBright} />
          </View>
          <AppText variant="label" center>
            No image selected
          </AppText>
          <AppText variant="small" color={Palette.textSecondary} center>
            Choose a photo from your device or capture a new one to analyze.
          </AppText>
          <View style={styles.pickRow}>
            <Button
              label="Gallery"
              icon="images-outline"
              variant="secondary"
              onPress={pickFromLibrary}
              style={styles.flex}
            />
            <Button
              label="Camera"
              icon="camera-outline"
              variant="secondary"
              onPress={takePhoto}
              style={styles.flex}
            />
          </View>
        </Card>
      )}

      <TextField
        label="Your question"
        placeholder="e.g. What is in this image? Describe the mood and colors."
        value={question}
        onChangeText={setQuestion}
        multiline
        numberOfLines={3}
        maxLength={400}
      />

      {error ? (
        <AppText variant="small" color={Palette.danger}>
          {error}
        </AppText>
      ) : null}

      <Button
        label="Analyze Image"
        icon="sparkles"
        loading={loading}
        disabled={!image}
        onPress={analyze}
      />

      {loading ? <LoadingState title="Analyzing image…" /> : null}

      {!loading && result ? (
        <Card glow style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Icon name="sparkles" size={16} color={Palette.primaryBright} />
            <AppText variant="label">Analysis</AppText>
            {result.mock ? (
              <AppText variant="tiny" color={Palette.warning}>
                Mock
              </AppText>
            ) : null}
          </View>
          <AppText variant="body" color={Palette.text}>
            {result.answer}
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    gap: Spacing.two,
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 128, 248, 0.3)',
  },
  pickRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  previewBlock: {
    gap: Spacing.two,
  },
  preview: {
    width: '100%',
    height: 260,
    borderRadius: Radius.lg,
    backgroundColor: Palette.cardElevated,
  },
  resultCard: {
    gap: Spacing.two,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
