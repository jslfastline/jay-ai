import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Icon, Logo, TextField } from '@/components/ui';
import { Gradients, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/store/AuthContext';

const CODE_LENGTH = 6;
const DEFAULT_TTL_SECONDS = 600;
const POLL_INTERVAL_MS = 4000;

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email?: string; code?: string; ttl?: string }>();
  const {
    pendingEmail,
    hasPendingSecret,
    startVerification,
    completeVerification,
    checkVerification,
    resendCode,
  } = useAuth();

  const targetEmail = pendingEmail ?? params.email ?? '';

  const initialSeconds = useMemo(() => {
    const parsed = Number(params.ttl);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS;
  }, [params.ttl]);

  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(params.code || null);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const navigated = useRef(false);

  // If we arrived with only an email (e.g. an unverified sign-in), kick off a
  // fresh challenge so this device holds the pairing secret for polling.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || pendingEmail || !params.email) return;
    started.current = true;
    startVerification(params.email).catch((err) =>
      setError(err instanceof Error ? err.message : 'Could not start verification.')
    );
  }, [pendingEmail, params.email, startVerification]);

  useEffect(() => {
    if (!targetEmail) router.replace('/(auth)/sign-up');
  }, [targetEmail]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const expired = secondsLeft <= 0;

  // Poll for link confirmation while this device holds the pairing secret.
  useEffect(() => {
    if (!hasPendingSecret || !targetEmail) return;
    const interval = setInterval(async () => {
      if (navigated.current) return;
      try {
        const done = await checkVerification();
        if (done && !navigated.current) {
          navigated.current = true;
          router.replace('/chat');
        }
      } catch {
        // Ignore transient polling errors; the countdown still guides the user.
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasPendingSecret, targetEmail, checkVerification]);

  const submitCode = useCallback(async () => {
    if (busy) return;
    setError(null);
    if (code.trim().length < CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code.`);
      return;
    }
    setBusy(true);
    try {
      await completeVerification(code.trim());
      navigated.current = true;
      router.replace('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not verify that code.');
    } finally {
      setBusy(false);
    }
  }, [busy, code, completeVerification]);

  const confirmLink = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const done = await checkVerification();
      if (done) {
        navigated.current = true;
      router.replace('/chat');
      } else {
        setNotice('Not confirmed yet. Tap the button in your email, then try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not check your verification.');
    } finally {
      setBusy(false);
    }
  }, [busy, checkVerification]);

  const resend = useCallback(async () => {
    if (resending) return;
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await resendCode();
      setSecondsLeft(DEFAULT_TTL_SECONDS);
      setDevCode(result.code ?? null);
      setNotice(result.delivered ? 'A new verification email is on its way.' : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the email.');
    } finally {
      setResending(false);
    }
  }, [resending, resendCode]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={Gradients.screen} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} pointerEvents="none" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <Logo size={72} />
            <AppText variant="title" center>
              Verify your email
            </AppText>
            <AppText variant="small" color={Palette.textSecondary} center>
              We sent a link to
            </AppText>
            <AppText variant="label" color={Palette.primaryBright} center>
              {targetEmail}
            </AppText>
          </View>

          <View style={styles.instructions}>
            <Icon name="mail" size={16} color={Palette.primaryBright} />
            <AppText variant="small" color={Palette.textSecondary} style={styles.flex}>
              Open the email and tap <AppText variant="small" color={Palette.text}>Verify Email Address</AppText>. This screen continues automatically once confirmed.
            </AppText>
          </View>

          {devCode ? (
            <View style={styles.devNotice}>
              <Icon name="info" size={14} color={Palette.warning} />
              <AppText variant="tiny" color={Palette.warning} style={styles.flex}>
                Email delivery is unavailable on the server. Your development code is{' '}
                <AppText variant="tiny" color={Palette.warning}>
                  {devCode}
                </AppText>
                .
              </AppText>
            </View>
          ) : null}

          <View style={styles.form}>
            {devCode ? (
              <TextField
                label="Verification code"
                placeholder="123456"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                value={code}
                onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
                editable={!busy}
              />
            ) : null}

            <View style={styles.timerRow}>
              <Icon
                name={expired ? 'alert-circle' : 'clock'}
                size={14}
                color={expired ? Palette.danger : Palette.textMuted}
              />
              <AppText variant="small" color={expired ? Palette.danger : Palette.textMuted}>
                {expired
                  ? 'This link has expired. Request a new one.'
                  : `Link expires in ${formatClock(secondsLeft)}`}
              </AppText>
            </View>

            {error ? (
              <View style={styles.error}>
                <Icon name="alert-circle" size={14} color={Palette.danger} />
                <AppText variant="small" color={Palette.danger} style={styles.flex}>
                  {error}
                </AppText>
              </View>
            ) : null}

            {notice ? (
              <View style={styles.error}>
                <Icon name="check" size={14} color={Palette.primaryBright} />
                <AppText variant="small" color={Palette.primaryBright} style={styles.flex}>
                  {notice}
                </AppText>
              </View>
            ) : null}

            {devCode ? (
              <Button label="Verify code" icon="arrow-forward" loading={busy} onPress={submitCode} />
            ) : (
              <Button label="I've verified my email" icon="arrow-forward" loading={busy} onPress={confirmLink} />
            )}

            <Pressable
              onPress={resend}
              disabled={resending}
              accessibilityRole="button"
              style={styles.resend}>
              <AppText variant="small" color={Palette.primaryBright}>
                {resending ? 'Sending a new email…' : 'Resend verification email'}
              </AppText>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.replace('/(auth)/sign-in')}
            accessibilityRole="button"
            style={styles.switch}>
            <AppText variant="small" color={Palette.textSecondary}>
              Wrong address?{' '}
              <AppText variant="small" color={Palette.primaryBright}>
                Back to sign in
              </AppText>
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.deepNavy,
  },
  flex: {
    flex: 1,
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
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  devNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  form: {
    gap: Spacing.three,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  resend: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  switch: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
