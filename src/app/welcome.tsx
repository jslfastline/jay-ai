import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Logo } from '@/components/ui';
import { interestLabels } from '@/constants/interests';
import { Gradients, Palette, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';

const STEPS = 5;
const DELAY_MS = 550;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const { personalization, completeIntro } = useApp();

  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);

  const nickname =
    personalization.nickname?.trim() ||
    (typeof window !== 'undefined' ? '' : ''); // placeholder; profile not needed here
  const displayName = nickname || 'there';

  const interestsText = interestLabels(personalization.interests).slice(0, 2).join(', ');
  const hasInterests = personalization.interests.length > 0;

  useEffect(() => {
    if (done) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < STEPS; i++) {
      timers.push(
        setTimeout(() => {
          setStage(i);
          if (i === STEPS - 1) {
            setDone(true);
          }
        }, DELAY_MS * i)
      );
    }
    return () => timers.forEach((t) => clearTimeout(t));
  }, [done]);

  if (status !== 'signedIn') {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (!personalization.complete) {
    return <Redirect href="/onboarding" />;
  }
  if (personalization.introSeen) {
    return <Redirect href="/chat" />;
  }

  const finishIntro = () => {
    completeIntro();
    router.replace('/chat');
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={Gradients.screen} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.five }]}
        showsVerticalScrollIndicator={false}>
        <Logo size={84} glow style={styles.iconWrap} />

        <View style={styles.lines}>
          {stage >= 0 ? (
            <Animated.View entering={FadeInUp.duration(400)} style={styles.line}>
              <AppText variant="title">Hello, {displayName}.</AppText>
            </Animated.View>
          ) : null}

          {stage >= 1 ? (
            <Animated.View entering={FadeInUp.duration(400)} style={styles.line}>
              <AppText variant="body" color={Palette.textSecondary}>
                I&apos;m Jay AI. My owner and creator is{' '}
                <AppText variant="label">Jay Bros</AppText> — Mmiliki wa{' '}
                <AppText variant="label">JSL FastLine</AppText> na{' '}
                <AppText variant="label">FastLine Technologies</AppText>.
              </AppText>
            </Animated.View>
          ) : null}

          {stage >= 2 ? (
            <Animated.View entering={FadeInUp.duration(400)} style={styles.line}>
              <AppText variant="body" color={Palette.textSecondary}>
                {hasInterests
                  ? `Nice to see you&apos;re into ${interestsText}. I&apos;ll keep answers relevant to what you care about.`
                  : "I&apos;m here to help you think, create, and get things done faster."}
              </AppText>
            </Animated.View>
          ) : null}

          {stage >= 3 ? (
            <Animated.View entering={FadeInUp.duration(400)} style={styles.line}>
              <AppText variant="body" color={Palette.textSecondary}>
                Feel free to ask anything. I aim to be clear, practical, and helpful.
              </AppText>
            </Animated.View>
          ) : null}

          {stage >= 4 ? (
            <Animated.View entering={FadeInUp.duration(400)} style={styles.line}>
              <AppText variant="heading">Where should we begin?</AppText>
            </Animated.View>
          ) : null}
        </View>

        {stage >= 4 ? (
          <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.chips}>
            <Chip label="Start a new chat" onPress={finishIntro} />
            <Chip label="Explore Tools" onPress={() => { completeIntro(); router.replace('/tools'); }} />
            <Chip label="Go to Profile" onPress={() => { completeIntro(); router.replace('/profile'); }} />
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.five }]}>
        <Button
          label={done ? 'Get started' : 'Next'}
          icon={done ? 'arrow-forward' : undefined}
          onPress={finishIntro}
        />
      </View>
    </View>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
      <AppText variant="small" color={Palette.textSecondary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.deepNavy,
  },
  glow: {
    position: 'absolute',
    top: -140,
    alignSelf: 'center',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(2, 132, 199, 0.16)',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  iconWrap: {
    alignSelf: 'center',
    marginTop: Spacing.three,
  },
  lines: {
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  line: {
    gap: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  chipPressed: {
    opacity: 0.85,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
});
