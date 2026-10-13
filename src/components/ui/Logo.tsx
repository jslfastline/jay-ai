import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppConfig } from '@/config';

const LOCAL_LOGO = require('@/assets/branding/jay-ai-logo.png');

export interface LogoProps {
  size?: number;
  /** Add a soft, borderless glow behind the mark (no box, no shadow). */
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Official Jay AI logo.
 *
 * Rendered cleanly on a transparent background — no surrounding box, border or
 * drop shadow — so the mark always reads clearly. Uses the bundled local asset
 * and transparently falls back to the remote source URL if it is unavailable.
 */
export function Logo({ size = 96, glow = false, style }: LogoProps) {
  const [useRemote, setUseRemote] = useState(false);
  const source = useRemote ? { uri: AppConfig.logo.remoteUrl } : LOCAL_LOGO;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {glow ? (
        <View
          pointerEvents="none"
          style={[styles.halo, { width: size * 1.6, height: size * 1.6, borderRadius: size * 0.8 }]}
        />
      ) : null}
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        transition={200}
        onError={() => setUseRemote(true)}
        accessibilityLabel="Jay AI logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    top: '-30%',
    left: '-30%',
    backgroundColor: 'rgba(2, 132, 199, 0.10)',
  },
});
