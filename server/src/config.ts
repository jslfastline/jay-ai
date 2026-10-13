import 'dotenv/config';

/**
 * Public base URL used inside emailed links so the phone can reach the server
 * (e.g. http://192.168.0.108:8787). Defaults to the listen address.
 */
const fallbackPort = read(process.env.PORT) ?? '8787';

function read(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(read(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Like readNumber but allows 0 (used to disable retries). */
function readCount(value: string | undefined, fallback: number): number {
  const raw = read(value);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Server configuration. Secrets are read from the environment here and are
 * never echoed back to clients or written to logs.
 */
export const config = {
  port: readNumber(process.env.PORT, 8787),

  /** Base URL used inside emailed verification links. No trailing slash. */
  publicBaseUrl: (read(process.env.PUBLIC_BASE_URL) ?? `http://localhost:${fallbackPort}`).replace(
    /\/+$/,
    ''
  ),

  /** OpenAI-compatible provider. Works with OpenAI, Azure-compatible gateways, Groq, Together, OpenRouter, local Ollama, etc. */
  provider: {
    apiKey: read(process.env.OPENAI_API_KEY),
    baseUrl: (read(process.env.OPENAI_BASE_URL) ?? 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: read(process.env.OPENAI_MODEL) ?? 'gpt-4o-mini',
    visionModel: read(process.env.OPENAI_VISION_MODEL),
    /** Some providers can accept short video inputs in a chat turn. Off by default. */
    videoSupported: read(process.env.OPENAI_VIDEO_SUPPORTED) === 'true',
    temperature: Number(read(process.env.OPENAI_TEMPERATURE) ?? '0.7'),
    maxTokens: readNumber(process.env.OPENAI_MAX_TOKENS, 2048),
    /** Retries when the provider is rate-limited (429) or temporarily unavailable (5xx). */
    maxRetries: readCount(process.env.PROVIDER_MAX_RETRIES, 3),
    /** Base backoff between retries, in milliseconds (grows exponentially). */
    retryBaseMs: readNumber(process.env.PROVIDER_RETRY_BASE_MS, 800),
  },

  /** Account authentication. In production ALWAYS set JWT_SECRET. */
  auth: {
    /** Falls back to a generated, logged-once development secret when unset. */
    jwtSecret: read(process.env.JWT_SECRET),
    jwtExpiresIn: read(process.env.JWT_EXPIRES_IN) ?? '30d',
    /** How long an emailed verification code stays valid, in minutes. */
    verifyTtlMinutes: readNumber(process.env.VERIFY_TTL_MINUTES, 10),
  },

  /**
   * Transactional email via EmailJS (https://www.emailjs.com). When unset the
   * server falls back to logging the verification code to the console so the
   * flow stays testable in development. Secrets are server-only.
   */
  email: {
    serviceId: read(process.env.EMAILJS_SERVICE_ID),
    templateId: read(process.env.EMAILJS_TEMPLATE_ID),
    publicKey: read(process.env.EMAILJS_PUBLIC_KEY),
    /** Optional: enables authenticated (server-side) sends. Keep secret. */
    privateKey: read(process.env.EMAILJS_PRIVATE_KEY),
    appName: read(process.env.EMAIL_APP_NAME) ?? 'Jay AI',
  },

  /** Max base64 payload accepted per request, in megabytes. */
  maxUploadMb: readNumber(process.env.MAX_UPLOAD_MB, 15),

  /** Comma-separated allowed origins, or "*". */
  corsOrigin: read(process.env.CORS_ORIGIN) ?? '*',

  /** Upstream request timeout. */
  requestTimeoutMs: readNumber(process.env.REQUEST_TIMEOUT_MS, 120_000),
} as const;

export const providerConfigured = (): boolean => Boolean(config.provider.apiKey);

export const visionModel = (): string => config.provider.visionModel ?? config.provider.model;

export const emailConfigured = (): boolean =>
  Boolean(config.email.serviceId && config.email.templateId && config.email.publicKey);

export const capabilities = () => ({
  chat: providerConfigured(),
  vision: providerConfigured(),
  documents: true,
  video: providerConfigured() && config.provider.videoSupported,
});
