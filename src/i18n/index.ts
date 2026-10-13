/**
 * Minimal localization layer.
 *
 * English ships first; Kiswahili is scaffolded so screens can be migrated
 * incrementally. Usage: `const t = useI18n(); t('nav.home')`.
 */

import { useCallback } from 'react';

import { useApp, type Locale } from '@/store/AppContext';

type Dictionary = Record<string, string>;

const en: Dictionary = {
  'app.name': 'Jay AI',
  'app.shortName': 'Jay AI',
  'app.tagline': 'Your Smart Assistant. Always with You.',
  'nav.home': 'Home',
  'nav.chat': 'Chats',
  'nav.tools': 'Tools',
  'nav.creations': 'Creations',
  'nav.profile': 'Profile',
  'home.welcomeBack': 'Welcome back',
  'home.workOn': 'What would you like to work on today?',
  'action.continue': 'Continue',
  'action.getStarted': 'Get Started',
  'action.generate': 'Generate',
  'action.cancel': 'Cancel',
  'action.retry': 'Retry',
  'action.delete': 'Delete',
  'common.credits': 'Credits',
  'common.mock': 'Mock',
};

const sw: Dictionary = {
  'app.name': 'Jay AI',
  'app.shortName': 'Jay AI',
  'app.tagline': 'Msaidizi Wako Mahiri. Daima Nawe.',
  'nav.home': 'Nyumbani',
  'nav.chat': 'Gumzo',
  'nav.tools': 'Zana',
  'nav.creations': 'Ubunifu',
  'nav.profile': 'Wasifu',
  'home.welcomeBack': 'Karibu tena',
  'home.workOn': 'Ungependa kufanya kazi gani leo?',
  'action.continue': 'Endelea',
  'action.getStarted': 'Anza',
  'action.generate': 'Tengeneza',
  'action.cancel': 'Ghairi',
  'action.retry': 'Jaribu tena',
  'action.delete': 'Futa',
  'common.credits': 'Kredi',
  'common.mock': 'Majimbo',
};

const DICTIONARIES: Record<Locale, Dictionary> = { en, sw };

export const locales: readonly { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Kiswahili' },
];

export function translate(locale: Locale, key: string): string {
  return DICTIONARIES[locale][key] ?? DICTIONARIES.en[key] ?? key;
}

export function useI18n() {
  const { settings } = useApp();
  return useCallback((key: string) => translate(settings.locale, key), [settings.locale]);
}
