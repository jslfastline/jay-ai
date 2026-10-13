import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { StorageKeys, storage } from '@/services/storage';
import type {
  Creation,
  CreditTransaction,
  CreditTransactionType,
  UserProfile,
} from '@/types';
import { createId, nowIso } from '@/utils/format';

/** Starting balance for the local development ledger. */
const DEV_STARTING_CREDITS = 300;

export type Locale = 'en' | 'sw';

export type ResponseStyle = 'concise' | 'balanced' | 'detailed';

export interface Settings {
  locale: Locale;
  hapticsEnabled: boolean;
  /** Free-form instructions describing how Jay AI should reply. */
  instructions: string;
  /** Preferred reply length. */
  responseStyle: ResponseStyle;
}

/** Answers from the one-time "what are you into?" personalization flow. */
export interface Personalization {
  interests: string[];
  goal: string | null;
  style: string | null;
  frequency: string | null;
  nickname: string | null;
  complete: boolean;
  /** True once the personalized welcome has been seen. */
  introSeen: boolean;
}

interface AppContextValue {
  ready: boolean;
  onboardingSeen: boolean;
  profile: UserProfile;
  credits: number;
  ledger: CreditTransaction[];
  creations: Creation[];
  settings: Settings;
  personalization: Personalization;
  completeOnboarding: () => void;
  /** Saves the personalization answers and marks the flow complete. */
  completePersonalization: (answers: {
    interests?: string[];
    goal?: string | null;
    style?: string | null;
    frequency?: string | null;
    nickname?: string | null;
  }) => void;
  /** Marks the personalized welcome as seen. */
  completeIntro: () => void;
  setProfile: (patch: Partial<UserProfile>) => void;
  setSettings: (patch: Partial<Settings>) => void;
  /** Records an optimistic local spend. Returns false when balance is insufficient. */
  spendCredits: (amount: number, description: string, mock?: boolean) => boolean;
  /** Development-only top-up; a real backend grants credits server-side. */
  grantCredits: (amount: number, description: string, mock?: boolean) => void;
  refundCredits: (amount: number, description: string, mock?: boolean) => void;
  addCreation: (creation: Creation) => void;
  updateCreation: (id: string, updater: (creation: Creation) => Creation) => void;
  removeCreation: (id: string) => void;
  clearCreations: () => void;
  signOut: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'local-user',
  displayName: 'Jay Creator',
  plan: 'free',
};

const DEFAULT_SETTINGS: Settings = {
  locale: 'en',
  hapticsEnabled: true,
  instructions: '',
  responseStyle: 'balanced',
};

const DEFAULT_PERSONALIZATION: Personalization = {
  interests: [],
  goal: null,
  style: null,
  frequency: null,
  nickname: null,
  complete: false,
  introSeen: false,
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const [profile, setProfileState] = useState<UserProfile>(DEFAULT_PROFILE);
  const [credits, setCredits] = useState(DEV_STARTING_CREDITS);
  const [ledger, setLedger] = useState<CreditTransaction[]>([]);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [personalization, setPersonalizationState] =
    useState<Personalization>(DEFAULT_PERSONALIZATION);
  const hydrated = useRef(false);
  /** Authoritative local balance. Mirrors `credits` state without impure updaters. */
  const balanceRef = useRef(DEV_STARTING_CREDITS);

  // Hydrate from storage once on mount.
  useEffect(() => {
    (async () => {
      const [
        seen,
        storedProfile,
        storedCredits,
        storedLedger,
        storedCreations,
        storedSettings,
        storedPersonalization,
      ] = await Promise.all([
        storage.get<boolean>(StorageKeys.onboardingSeen),
        storage.get<UserProfile>(StorageKeys.profile),
        storage.get<number>(StorageKeys.creditsBalance),
        storage.get<CreditTransaction[]>(StorageKeys.creditLedger),
        storage.get<Creation[]>(StorageKeys.creations),
        storage.get<Settings>(StorageKeys.settings),
        storage.get<Personalization>(StorageKeys.personalization),
      ]);

      if (storedProfile) setProfileState({ ...DEFAULT_PROFILE, ...storedProfile });
      if (typeof storedCredits === 'number') {
        setCredits(storedCredits);
        balanceRef.current = storedCredits;
      }
      if (storedLedger) setLedger(storedLedger);
      if (storedCreations) setCreations(storedCreations);
      if (storedSettings) setSettingsState({ ...DEFAULT_SETTINGS, ...storedSettings });
      if (storedPersonalization) {
        setPersonalizationState({ ...DEFAULT_PERSONALIZATION, ...storedPersonalization });
      }
      if (seen) setOnboardingSeen(true);

      hydrated.current = true;
      setReady(true);
    })();
  }, []);

  // Persist changes after hydration.
  useEffect(() => {
    if (hydrated.current) void storage.set(StorageKeys.profile, profile);
  }, [profile]);
  useEffect(() => {
    if (hydrated.current) void storage.set(StorageKeys.creditsBalance, credits);
  }, [credits]);
  useEffect(() => {
    if (hydrated.current) void storage.set(StorageKeys.creditLedger, ledger);
  }, [ledger]);
  useEffect(() => {
    if (hydrated.current) void storage.set(StorageKeys.creations, creations);
  }, [creations]);
  useEffect(() => {
    if (hydrated.current) void storage.set(StorageKeys.settings, settings);
  }, [settings]);
  useEffect(() => {
    if (hydrated.current) void storage.set(StorageKeys.personalization, personalization);
  }, [personalization]);

  /** Records an optimistic local ledger entry and mirrors the balance. */
  const applyTransaction = useCallback(
    (type: CreditTransactionType, amount: number, description: string, mock?: boolean) => {
      const next = balanceRef.current + amount;
      if (next < 0) return false;
      balanceRef.current = next;
      setCredits(next);
      const transaction: CreditTransaction = {
        id: createId('txn'),
        type,
        amount,
        balanceAfter: next,
        description,
        createdAt: nowIso(),
        mock,
      };
      setLedger((current) => [transaction, ...current].slice(0, 200));
      return true;
    },
    []
  );

  /**
   * Development-only optimistic spend. With a real backend, the server is the
   * final authority; this is purely a local simulation so the UI is testable.
   */
  const spendCredits = useCallback(
    (amount: number, description: string, mock?: boolean): boolean => {
      if (amount <= 0) return true;
      return applyTransaction('spend', -Math.abs(amount), description, mock);
    },
    [applyTransaction]
  );

  const grantCredits = useCallback(
    (amount: number, description: string, mock?: boolean) => {
      if (amount <= 0) return;
      applyTransaction('grant', amount, description, mock);
    },
    [applyTransaction]
  );

  const refundCredits = useCallback(
    (amount: number, description: string, mock?: boolean) => {
      if (amount <= 0) return;
      applyTransaction('refund', amount, description, mock);
    },
    [applyTransaction]
  );

  const completeOnboarding = useCallback(() => {
    setOnboardingSeen(true);
    void storage.set(StorageKeys.onboardingSeen, true);
  }, []);

  const completePersonalization = useCallback(
    (answers: {
      interests?: string[];
      goal?: string | null;
      style?: string | null;
      frequency?: string | null;
      nickname?: string | null;
    }) => {
      setPersonalizationState((current) => ({
        ...current,
        ...answers,
        complete: true,
      }));
    },
    []
  );

  const completeIntro = useCallback(() => {
    setPersonalizationState((current) => ({ ...current, introSeen: true }));
  }, []);

  const setProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfileState((current) => ({ ...current, ...patch }));
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((current) => ({ ...current, ...patch }));
  }, []);

  const addCreation = useCallback((creation: Creation) => {
    setCreations((current) => [creation, ...current].slice(0, 200));
  }, []);

  const updateCreation = useCallback((id: string, updater: (creation: Creation) => Creation) => {
    setCreations((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  }, []);

  const removeCreation = useCallback((id: string) => {
    setCreations((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearCreations = useCallback(() => setCreations([]), []);

  const signOut = useCallback(() => {
    setProfileState(DEFAULT_PROFILE);
    balanceRef.current = DEV_STARTING_CREDITS;
    setCredits(DEV_STARTING_CREDITS);
    setLedger([]);
    setCreations([]);
    setOnboardingSeen(false);
    setSettingsState(DEFAULT_SETTINGS);
    setPersonalizationState(DEFAULT_PERSONALIZATION);
    void Promise.all([
      storage.remove(StorageKeys.profile),
      storage.remove(StorageKeys.creditsBalance),
      storage.remove(StorageKeys.creditLedger),
      storage.remove(StorageKeys.creations),
      storage.remove(StorageKeys.onboardingSeen),
      storage.remove(StorageKeys.settings),
      storage.remove(StorageKeys.personalization),
    ]);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      onboardingSeen,
      profile,
      credits,
      ledger,
      creations,
      settings,
      personalization,
      completeOnboarding,
      completePersonalization,
      completeIntro,
      setProfile,
      setSettings,
      spendCredits,
      grantCredits,
      refundCredits,
      addCreation,
      updateCreation,
      removeCreation,
      clearCreations,
      signOut,
    }),
    [
      ready,
      onboardingSeen,
      profile,
      credits,
      ledger,
      creations,
      settings,
      personalization,
      completeOnboarding,
      completePersonalization,
      completeIntro,
      setProfile,
      setSettings,
      spendCredits,
      grantCredits,
      refundCredits,
      addCreation,
      updateCreation,
      removeCreation,
      clearCreations,
      signOut,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
