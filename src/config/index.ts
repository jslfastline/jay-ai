/**
 * Runtime configuration.
 *
 * Secrets must NEVER live in the client. This module only reads public,
 * non-sensitive configuration and decides whether the app talks to a real
 * backend or runs in explicit mock mode.
 *
 * Set values in a local `.env` file (see `.env.example`).
 * Expo inlines any variable prefixed with `EXPO_PUBLIC_` at build time.
 */

function readEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export const AppConfig = {
  appName: 'Jay AI',
  shortName: 'Jay AI',
  tagline: 'Fast Connections, Smart Future.',
  version: '1.0.0',

  /** Base URL of the Jay AI backend (no trailing slash). */
  apiBaseUrl: readEnv(process.env.EXPO_PUBLIC_API_BASE_URL),

  /** Request timeout in milliseconds. */
  requestTimeoutMs: Number(readEnv(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS) ?? 30000),

  /** Force mock mode on/off. Defaults to mock when no backend is configured. */
  forceMock: readEnv(process.env.EXPO_PUBLIC_USE_MOCK) === 'true',

  /** Feature flag: allow mock image results to render real placeholder imagery. */
  mockShowPlaceholderImages:
    readEnv(process.env.EXPO_PUBLIC_MOCK_PLACEHOLDER_IMAGES) !== 'false',

  /** Chat attachments: max size per file (MB) and max files per message. */
  attachmentMaxMb: Number(readEnv(process.env.EXPO_PUBLIC_ATTACHMENT_MAX_MB) ?? 15),
  maxAttachmentsPerMessage: Number(readEnv(process.env.EXPO_PUBLIC_MAX_ATTACHMENTS) ?? 6),

  logo: {
    /** Official logo, kept for documentation and remote fallback. */
    remoteUrl:
      'https://res.cloudinary.com/dlsr1yu7v/image/upload/v1791835511/pnmqnute6hnx2ypx3hjg.png',
  },
} as const;

/**
 * Whether the app should use the local mock provider instead of a real backend.
 * Mock mode is the safe default until a backend is configured.
 */
export const isMockMode = (): boolean => AppConfig.forceMock || !AppConfig.apiBaseUrl;

export type AppConfigShape = typeof AppConfig;
