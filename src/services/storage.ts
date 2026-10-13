import AsyncStorage from '@react-native-async-storage/async-storage';

/** Namespaced, JSON-safe storage helpers with graceful failure. */
export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Persistence failures should never crash the UI.
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
} as const;

export const StorageKeys = {
  creditsBalance: 'jay.credits.balance',
  creditLedger: 'jay.credits.ledger',
  creations: 'jay.creations',
  profile: 'jay.profile',
  onboardingSeen: 'jay.onboarding.seen',
  personalization: 'jay.personalization',
  settings: 'jay.settings',
} as const;
