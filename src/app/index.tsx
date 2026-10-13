import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText, Button, Icon, type IconName, Logo } from '@/components/ui';
import { Gradients, Palette, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';

const MIN_SPLASH_MS = 1100;
/** Registered users always see the splash for five seconds after signing in. */
const WELCOME_SPLASH_MS = 5000;

export default function SplashOnboardingScreen() {
  const { ready, onboardingSeen, completeOnboarding, personalization } = useApp();
  const { status } = useAuth();
  const t = useI18n();
  const [minElapsed, setMinElapsed] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    if (!ready || status === 'loading') return;
    const delay = status === 'signedIn' ? WELCOME_SPLASH_MS : MIN_SPLASH_MS;
    const timer = setTimeout(() => setMinElapsed(true), delay);
    return () => clearTimeout(timer);
  }, [ready, status]);

  useEffect(() => {
    if (!ready || status === 'loading' || !minElapsed || !onboardingSeen || navigated.current) {
      return;
    }
    navigated.current = true;
    if (status === 'signedIn') {
      router.replace(
        !personalization.complete
          ? '/onboarding'
          : !personalization.introSeen
            ? '/welcome'
            : '/chat'
      );
    } else {
      router.replace('/(auth)/sign-in');
    }
  }, [ready, status, minElapsed, onboardingSeen, personalization.complete, personalization.introSeen]);

  const showOnboarding = ready && minElapsed && !onboardingSeen;

  const handleStart = () => {
    completeOnboarding();
    router.replace(status === 'signedIn' ? '/chat' : '/(auth)/sign-in');
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={Gradients.screen} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <Animated.View entering={FadeIn.duration(500)} style={styles.center}>
        <Logo size={128} />
        <AppText variant="display" center style={styles.name}>
          {t('app.name')}
        </AppText>
        <AppText variant="body" color={Palette.textSecondary} center>
          {t('app.tagline')}
        </AppText>
      </Animated.View>

      <View style={styles.bottom}>
        {showOnboarding ? (
          <Animated.View entering={FadeInDown.duration(450)} style={styles.onboarding}>
            <View style={styles.featureList}>
              <Feature
                icon="videocam"
                title="AI Video Studio"
                text="Create multi-scene cinematic videos from a prompt."
              />
              <Feature
                icon="chatbubbles"
                title="Smart Chat"
                text="Ask, brainstorm and script with an AI assistant."
              />
              <Feature
                icon="images"
                title="Image Tools"
                text="Generate and analyze images right on your phone."
              />
            </View>
            <Button label={t('action.getStarted')} icon="arrow-forward" onPress={handleStart} />
          </Animated.View>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={Palette.primaryBright} />
            <AppText variant="small" color={Palette.textMuted}>
              Initializing Jay AI…
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

function Feature({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Icon name={icon} size={18} color={Palette.primaryBright} />
      </View>
      <View style={styles.featureText}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="small" color={Palette.textSecondary}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.deepNavy,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    justifyContent: 'space-between',
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(2, 132, 199, 0.22)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -160,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(56, 128, 248, 0.16)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.seven,
  },
  name: {
    marginTop: Spacing.two,
  },
  bottom: {
    minHeight: 260,
    justifyContent: 'flex-end',
  },
  onboarding: {
    gap: Spacing.five,
  },
  featureList: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  feature: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.14)',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  loading: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
});
