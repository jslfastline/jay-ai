import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { usingMockProvider } from '@/services/api';
import {
  loginRequest,
  meRequest,
  registerRequest,
  resendRequest,
  tokenStore,
  verifyRequest,
  type AuthUser,
  type Credentials,
  type Registration,
} from '@/services/auth';
import { storage } from '@/services/storage';
import { createId } from '@/utils/format';

import { useApp } from './AppContext';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

export interface SignUpResult {
  verificationRequired: boolean;
  email: string;
  delivered: boolean;
  /** Development-only code returned when no email provider is configured. */
  code?: string;
}

export interface ResendResult {
  delivered: boolean;
  code?: string;
}

interface PendingVerification {
  email: string;
  secret: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** True when the account lives only on this device (no backend configured). */
  isLocal: boolean;
  /** Email awaiting verification, if the user started a sign-up/sign-in. */
  pendingEmail: string | null;
  /** True when this device holds the secret needed to poll for link confirmation. */
  hasPendingSecret: boolean;
  signIn: (credentials: Credentials) => Promise<void>;
  signUp: (input: Registration) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  /** Starts (or restarts) verification, sending a fresh email. */
  startVerification: (email: string) => Promise<ResendResult>;
  /** Requests a fresh verification email for the pending address. */
  resendCode: () => Promise<ResendResult>;
  /** Reports whether the emailed link has been confirmed; signs in if so. */
  checkVerification: () => Promise<boolean>;
  /** Submits the emailed code; signs the user in on success. */
  completeVerification: (code: string) => Promise<void>;
}

const LOCAL_USER_KEY = 'jay.auth.localUser';
const PENDING_KEY = 'jay.auth.pending';

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Account state. With a backend configured, identity is verified server-side
 * (JWT). In mock mode, a clearly-labelled local device account is used so the
 * app stays usable without a backend.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile, signOut: clearLocalData } = useApp();
  const isLocal = usingMockProvider();

  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pending, setPending] = useState<PendingVerification | null>(null);

  const setPendingVerification = useCallback(async (next: PendingVerification | null) => {
    setPending(next);
    if (next) await storage.set(PENDING_KEY, next);
    else await storage.remove(PENDING_KEY);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (isLocal) {
          const local = await storage.get<AuthUser>(LOCAL_USER_KEY);
          if (!active) return;
          if (local) {
            setUser(local);
            setProfile({ id: local.id, displayName: local.displayName, plan: local.plan });
            setStatus('signedIn');
          } else {
            setStatus('signedOut');
          }
          return;
        }

        const token = await tokenStore.get();
        if (!token) {
          const stored = await storage.get<PendingVerification>(PENDING_KEY);
          if (active && stored) setPending(stored);
          if (active) setStatus('signedOut');
          return;
        }
        const current = await meRequest(token);
        if (!active) return;
        setUser(current);
        setProfile({ id: current.id, displayName: current.displayName, plan: current.plan });
        setStatus('signedIn');
      } catch {
        await tokenStore.clear();
        if (active) {
          setUser(null);
          setStatus('signedOut');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [isLocal, setProfile]);

  const applyUser = useCallback(
    (next: AuthUser) => {
      setUser(next);
      setProfile({ id: next.id, displayName: next.displayName, plan: next.plan });
      setStatus('signedIn');
    },
    [setProfile]
  );

  const signUp = useCallback(
    async (input: Registration): Promise<SignUpResult> => {
      const email = input.email.trim().toLowerCase();
      if (isLocal) {
        const account: AuthUser = {
          id: createId('local'),
          displayName: input.displayName.trim() || input.email.split('@')[0],
          email,
          plan: 'free',
          createdAt: new Date().toISOString(),
          verified: true,
        };
        await storage.set(LOCAL_USER_KEY, account);
        applyUser(account);
        return { verificationRequired: false, email, delivered: false };
      }
      const challenge = await registerRequest(input);
      if (challenge.pairingSecret) {
        await setPendingVerification({ email: challenge.email, secret: challenge.pairingSecret });
      }
      return {
        verificationRequired: challenge.verificationRequired,
        email: challenge.email,
        delivered: challenge.delivered,
        code: challenge.code,
      };
    },
    [applyUser, isLocal, setPendingVerification]
  );

  const signIn = useCallback(
    async (credentials: Credentials) => {
      if (isLocal) {
        const existing = await storage.get<AuthUser>(LOCAL_USER_KEY);
        const email = credentials.email.trim().toLowerCase();
        const account: AuthUser =
          existing && existing.email === email
            ? existing
            : {
                id: createId('local'),
                displayName: email.split('@')[0],
                email,
                plan: 'free',
                createdAt: new Date().toISOString(),
                verified: true,
              };
        await storage.set(LOCAL_USER_KEY, account);
        applyUser(account);
        return;
      }
      const { token, user: signedIn } = await loginRequest(credentials);
      await tokenStore.set(token);
      applyUser(signedIn);
    },
    [applyUser, isLocal]
  );

  const startVerification = useCallback(
    async (email: string): Promise<ResendResult> => {
      const normalised = email.trim().toLowerCase();
      const challenge = await resendRequest(normalised);
      await setPendingVerification({
        email: normalised,
        secret: challenge.pairingSecret ?? '',
      });
      return { delivered: challenge.delivered, code: challenge.code };
    },
    [setPendingVerification]
  );

  const resendCode = useCallback(async (): Promise<ResendResult> => {
    if (!pending?.email) {
      throw new Error('No email is awaiting verification. Please sign up again.');
    }
    const challenge = await resendRequest(pending.email);
    if (challenge.pairingSecret) {
      await setPendingVerification({ email: pending.email, secret: challenge.pairingSecret });
    }
    return { delivered: challenge.delivered, code: challenge.code };
  }, [pending, setPendingVerification]);

  const checkVerification = useCallback(async (): Promise<boolean> => {
    if (!pending) return false;
    const outcome = await verifyRequest(pending.email, { pairingSecret: pending.secret });
    if (outcome.verified && outcome.token && outcome.user) {
      await tokenStore.set(outcome.token);
      await setPendingVerification(null);
      applyUser(outcome.user);
      return true;
    }
    return false;
  }, [applyUser, pending, setPendingVerification]);

  const completeVerification = useCallback(
    async (code: string) => {
      if (!pending) {
        throw new Error('No email is awaiting verification. Please sign up again.');
      }
      const outcome = await verifyRequest(pending.email, {
        code,
        pairingSecret: pending.secret,
      });
      if (!outcome.verified || !outcome.token || !outcome.user) {
        throw new Error('We could not verify that code.');
      }
      await tokenStore.set(outcome.token);
      await setPendingVerification(null);
      applyUser(outcome.user);
    },
    [applyUser, pending, setPendingVerification]
  );

  const signOut = useCallback(async () => {
    await tokenStore.clear();
    await storage.remove(LOCAL_USER_KEY);
    await storage.remove(PENDING_KEY);
    setUser(null);
    setPending(null);
    setStatus('signedOut');
    clearLocalData();
  }, [clearLocalData]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isLocal,
      pendingEmail: pending?.email ?? null,
      hasPendingSecret: Boolean(pending?.secret),
      signIn,
      signUp,
      signOut,
      startVerification,
      resendCode,
      checkVerification,
      completeVerification,
    }),
    [
      status,
      user,
      isLocal,
      pending,
      signIn,
      signUp,
      signOut,
      startVerification,
      resendCode,
      checkVerification,
      completeVerification,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
