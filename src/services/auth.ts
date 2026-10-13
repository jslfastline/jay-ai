import * as SecureStore from 'expo-secure-store';

import { apiRequest } from '@/services/http';
import { storage } from '@/services/storage';

/** A signed-in user as returned by the backend. */
export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
  plan: 'free' | 'pro';
  createdAt: string;
  verified?: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/** Result of a registration / resend that still needs email verification. */
export interface VerificationChallenge {
  verificationRequired: boolean;
  email: string;
  delivered: boolean;
  /** Only present outside production when no email provider is configured. */
  code?: string;
  /** Device-held secret used to poll for link confirmation. */
  pairingSecret?: string;
  expiresInMinutes?: number;
}

/** Outcome of a verification attempt. */
export interface VerifyOutcome {
  verified: boolean;
  token?: string;
  user?: AuthUser;
}

const TOKEN_KEY = 'jay.auth.token';

/**
 * Session token storage. Prefers the OS keychain (SecureStore) and falls back
 * to namespaced storage where SecureStore is unavailable (e.g. web).
 */
export const tokenStore = {
  async get(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) return token;
    } catch {
      // SecureStore unavailable; fall through.
    }
    return storage.get<string>(TOKEN_KEY);
  },

  async set(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch {
      // ignore
    }
    await storage.set(TOKEN_KEY, token);
  },

  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // ignore
    }
    await storage.remove(TOKEN_KEY);
  },
};

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  displayName: string;
}

/** Creates a new account on the backend. Returns a verification challenge. */
export function registerRequest(input: Registration): Promise<VerificationChallenge> {
  return apiRequest<VerificationChallenge>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Signs in against the backend. */
export function loginRequest(input: Credentials): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Confirms an emailed code, or (with no code) reports whether the emailed link
 * has been clicked. The pairing secret ties the request to this device.
 */
export function verifyRequest(
  email: string,
  payload: { code?: string; pairingSecret?: string }
): Promise<VerifyOutcome> {
  return apiRequest<VerifyOutcome>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ email, ...payload }),
  });
}

/** Re-sends a fresh verification email and rotates the pairing secret. */
export function resendRequest(email: string): Promise<VerificationChallenge> {
  return apiRequest<VerificationChallenge>('/auth/resend', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** Resolves the current user for a stored token. */
export async function meRequest(token: string): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.user;
}
