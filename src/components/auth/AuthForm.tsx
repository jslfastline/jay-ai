import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Icon, Logo, TextField } from '@/components/ui';
import { Gradients, Palette, Radius, Spacing } from '@/constants/theme';
import { ApiError } from '@/services/http';
import { useAuth } from '@/store/AuthContext';

export type AuthMode = 'signIn' | 'signUp';

export interface AuthFormProps {
  mode: AuthMode;
}

/** Shared sign-in / sign-up form used by the (auth) routes. */
export function AuthForm({ mode }: AuthFormProps) {
  const { signIn, signUp, isLocal, startVerification } = useAuth();
  const isSignUp = mode === 'signUp';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);

    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        const result = await signUp({ displayName, email, password });
        if (result.verificationRequired) {
          router.replace({
            pathname: '/(auth)/verify',
            params: { email: result.email, code: result.code ?? '' },
          });
          return;
        }
      } else {
        try {
          await signIn({ email, password });
        } catch (err) {
          if (err instanceof ApiError && err.code === 'email_not_verified') {
            const delivery = await startVerification(email);
            router.replace({
              pathname: '/(auth)/verify',
              params: { email, code: delivery.code ?? '' },
            });
            return;
          }
          throw err;
        }
      }
      router.replace('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const passwordToggle = (
    <Pressable
      onPress={() => setShowPassword((value) => !value)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
      <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color={Palette.textSecondary} />
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={Gradients.screen} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} pointerEvents="none" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <Logo size={80} />
            <AppText variant="title" center>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </AppText>
            <AppText variant="small" color={Palette.textSecondary} center>
              {isSignUp
                ? 'Sign up to keep your studio, credits and creations together.'
                : 'Sign in to continue to Jay AI.'}
            </AppText>
          </View>

          {isLocal ? (
            <View style={styles.localNotice}>
              <Icon name="info" size={14} color={Palette.warning} />
              <AppText variant="tiny" color={Palette.warning} style={styles.flex}>
                No backend configured — this creates a local device account only. Set
                EXPO_PUBLIC_API_BASE_URL to enable real accounts.
              </AppText>
            </View>
          ) : null}

          <View style={styles.form}>
            {isSignUp ? (
              <TextField
                label="Display name"
                placeholder="Jay Creator"
                autoCapitalize="words"
                autoComplete="name"
                value={displayName}
                onChangeText={setDisplayName}
                editable={!busy}
              />
            ) : null}

            <TextField
              label="Email"
              placeholder="jaybros3105@gmail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              editable={!busy}
            />

            <TextField
              label="Password"
              placeholder="At least 6 characters"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChangeText={setPassword}
              editable={!busy}
              accessory={passwordToggle}
            />

            {isSignUp ? (
              <TextField
                label="Confirm password"
                placeholder="Re-enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!busy}
                accessory={passwordToggle}
              />
            ) : null}

            {error ? (
              <View style={styles.error}>
                <Icon name="alert-circle" size={14} color={Palette.danger} />
                <AppText variant="small" color={Palette.danger} style={styles.flex}>
                  {error}
                </AppText>
              </View>
            ) : null}

            <Button
              label={isSignUp ? 'Create account' : 'Sign in'}
              icon="arrow-forward"
              loading={busy}
              onPress={submit}
            />
          </View>

          <Pressable
            onPress={() => router.replace(isSignUp ? '/(auth)/sign-in' : '/(auth)/sign-up')}
            accessibilityRole="button"
            style={styles.switch}>
            <AppText variant="small" color={Palette.textSecondary}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <AppText variant="small" color={Palette.primaryBright}>
                {isSignUp ? 'Sign in' : 'Sign up'}
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
  localNotice: {
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
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  switch: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
