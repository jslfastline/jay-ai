import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, ChoiceGroup, Icon, TextField, type ChoiceOption } from '@/components/ui';
import { INTERESTS } from '@/constants/interests';
import { Gradients, Palette, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';

const GOALS: ChoiceOption<string>[] = [
  { value: 'chat', label: 'Chat & ask questions' },
  { value: 'images', label: 'Create images' },
  { value: 'video', label: 'Make videos' },
  { value: 'documents', label: 'Analyze files' },
];

const STYLES: ChoiceOption<string>[] = [
  { value: 'concise', label: 'Concise', hint: 'Short, to the point' },
  { value: 'balanced', label: 'Balanced', hint: 'A little context' },
  { value: 'detailed', label: 'Detailed', hint: 'Thorough answers' },
];

const FREQUENCIES: ChoiceOption<string>[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'A few times a week' },
  { value: 'sometimes', label: 'Now and then' },
  { value: 'exploring', label: 'Just exploring' },
];

const TOTAL_STEPS = 5;

export default function InterestsOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { status, user } = useAuth();
  const { personalization, completePersonalization } = useApp();

  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>(personalization.interests);
  const [goal, setGoal] = useState<string>(personalization.goal ?? 'chat');
  const [style, setStyle] = useState<string>(personalization.style ?? 'balanced');
  const [frequency, setFrequency] = useState<string>(personalization.frequency ?? 'weekly');
  const [nickname, setNickname] = useState<string>(
    personalization.nickname ?? user?.displayName ?? ''
  );

  if (status !== 'signedIn') {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (personalization.complete) {
    return <Redirect href="/welcome" />;
  }

  const toggleInterest = (value: string) =>
    setInterests((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );

  const finish = (skip = false) => {
    completePersonalization({
      interests: skip ? [] : interests,
      goal: skip ? null : goal,
      style: skip ? null : style,
      frequency: skip ? null : frequency,
      nickname: skip ? null : nickname.trim() || null,
    });
    router.replace('/welcome'); // route to welcome intro

  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep((value) => value + 1);
    else finish();
  };

  const canContinue =
    step === 0
      ? interests.length > 0
      : step === 4
        ? nickname.trim().length > 0
        : true;

  return (
    <View style={styles.root}>
      <LinearGradient colors={Gradients.screen} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} pointerEvents="none" />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.five }]}>
        {step > 0 ? (
          <Pressable
            onPress={() => setStep((value) => value - 1)}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.back}>
            <Icon name="chevron-back" size={20} color={Palette.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <View key={index} style={[styles.dot, index <= step && styles.dotActive]} />
          ))}
        </View>
        <Pressable onPress={() => finish(true)} accessibilityRole="button" style={styles.skip}>
          <AppText variant="small" color={Palette.textMuted}>
            Skip
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <Animated.View key="step0" entering={FadeInRight.duration(350)} style={styles.section}>
            <AppText variant="title">What are you interested in most?</AppText>
            <AppText variant="small" color={Palette.textSecondary}>
              Pick a few. Jay AI will tailor its answers to what you care about.
            </AppText>
            <View style={styles.chipRow}>
              {INTERESTS.map((item) => {
                const selected = interests.includes(item.value);
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => toggleInterest(item.value)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={item.label}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Icon
                      name={item.icon}
                      size={16}
                      color={selected ? Palette.white : Palette.textSecondary}
                    />
                    <AppText variant="small" color={selected ? Palette.white : Palette.textSecondary}>
                      {item.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        {step === 1 ? (
          <Animated.View key="step1" entering={FadeInRight.duration(350)} style={styles.section}>
            <AppText variant="title">What would you like to do first?</AppText>
            <AppText variant="small" color={Palette.textSecondary}>
              We’ll open this for you when you land in chat.
            </AppText>
            <ChoiceGroup options={GOALS} value={goal} onChange={setGoal} columns={2} />
          </Animated.View>
        ) : null}

        {step === 2 ? (
          <Animated.View key="step2" entering={FadeInRight.duration(350)} style={styles.section}>
            <AppText variant="title">How should Jay reply?</AppText>
            <AppText variant="small" color={Palette.textSecondary}>
              You can change this any time in Settings.
            </AppText>
            <ChoiceGroup options={STYLES} value={style} onChange={setStyle} />
          </Animated.View>
        ) : null}

        {step === 3 ? (
          <Animated.View key="step3" entering={FadeInRight.duration(350)} style={styles.section}>
            <AppText variant="title">How often would you use Jay AI?</AppText>
            <AppText variant="small" color={Palette.textSecondary}>
              This helps shape a plan that fits your rhythm.
            </AppText>
            <ChoiceGroup options={FREQUENCIES} value={frequency} onChange={setFrequency} />
          </Animated.View>
        ) : null}

        {step === 4 ? (
          <Animated.View key="step4" entering={FadeInRight.duration(350)} style={styles.section}>
            <AppText variant="title">What should we call you?</AppText>
            <AppText variant="small" color={Palette.textSecondary}>
              We’ll use your name in a friendly intro.
            </AppText>
            <TextField
              value={nickname}
              onChangeText={setNickname}
              placeholder="e.g. Alex"
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={next}
            />
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.five }]}>
        <Button
          label={step === TOTAL_STEPS - 1 ? 'Finish' : 'Continue'}
          icon="arrow-forward"
          disabled={!canContinue}
          onPress={next}
        />
      </View>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  back: {
    width: 32,
    alignItems: 'flex-start',
  },
  skip: {
    width: 32,
    alignItems: 'flex-end',
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  dot: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
  },
  dotActive: {
    backgroundColor: Palette.primaryBright,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
  },
  section: {
    gap: Spacing.four,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  chipSelected: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primaryBright,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
});
