import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { BottomTabInset, Gradients, Spacing } from '@/constants/theme';

export interface ScreenProps {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Extra bottom padding to clear the floating tab bar. */
  withTabInset?: boolean;
  contentStyle?: ViewStyle;
  /** Safe-area edges to respect. */
  edges?: Edge[];
}

/** Full-screen navy gradient container with safe-area handling. */
export function Screen({
  children,
  scroll = true,
  withTabInset = false,
  contentStyle,
  edges = ['top', 'left', 'right'],
}: ScreenProps) {
  const bottomPadding = withTabInset ? BottomTabInset + Spacing.four : Spacing.five;

  const inner = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, { paddingBottom: bottomPadding }, contentStyle]}>
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={Gradients.screen} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} pointerEvents="none" />
      <SafeAreaView style={styles.flex} edges={edges}>
        {inner}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.four,
  },
  glow: {
    position: 'absolute',
    top: -140,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(2, 132, 199, 0.22)',
  },
});
