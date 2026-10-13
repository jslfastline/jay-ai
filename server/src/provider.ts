import { config } from './config.js';
import { ApiError } from './errors.js';
import { extractDocuments, parseDataUrl, type IncomingAttachment } from './attachments.js';

export interface AppMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: IncomingAttachment[];
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'video_url'; video_url: { url: string } };

interface ProviderMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

const SYSTEM_PROMPT =
  'You are Jay AI, the assistant built into the Jay AI creative studio. ' +
  'Be helpful, accurate and concise. Use Markdown for structure when it improves ' +
  'readability (headings, lists, bold, fenced code blocks). If you do not know ' +
  'something, say so plainly instead of inventing an answer. When the user shares ' +
  'files, ground your answer in their contents. ' +
  'Your owner and creator is Jay Bros — Mmiliki wa JSL FastLine na FastLine ' +
  'Technologies — and you were built by him. If anyone asks who made you, who owns ' +
  'you, or who you work for, say clearly that your owner and creator is Jay Bros ' +
  '(Mmiliki wa JSL FastLine na FastLine Technologies). Never claim a different ' +
  'creator, company or origin.';

/** Maximum length of user-supplied custom instructions we will forward. */
const MAX_INSTRUCTIONS = 2000;

/**
 * Builds the effective system prompt from the base persona plus optional
 * user preferences (custom instructions and a preferred reply length).
 * User text is treated as preferences, never as a replacement for the persona.
 */
export function buildSystemPrompt(instructions?: string, style?: string): string {
  let prompt = SYSTEM_PROMPT;
  if (style === 'concise') {
    prompt += ' Keep replies short and to the point; prefer a few sentences unless asked for more.';
  } else if (style === 'detailed') {
    prompt += ' Give thorough, well-structured answers with relevant detail and examples.';
  }
  const trimmed = instructions?.trim();
  if (trimmed) {
    const clipped = trimmed.slice(0, MAX_INSTRUCTIONS);
    prompt += `\n\nThe user has set these preferences for how you should reply. Follow them when they do not conflict with your identity or with safety: ${clipped}`;
  }
  return prompt;
}

/**
 * Normalises the app's message list into provider messages, turning
 * attachments into text context (documents) and multimodal parts (images/video).
 */
export async function buildProviderMessages(
  messages: AppMessage[],
  systemPrompt: string = SYSTEM_PROMPT
): Promise<ProviderMessage[]> {
  const maxBytes = Math.round(config.maxUploadMb * 1024 * 1024);
  const result: ProviderMessage[] = [{ role: 'system', content: systemPrompt }];

  for (const message of messages) {
    const attachments = message.attachments ?? [];
    const text = message.content?.trim() ?? '';
    const documents = await extractDocuments(attachments, maxBytes);
    const media = attachments.filter((item) => item.kind === 'image' || item.kind === 'video');

    if (media.length === 0) {
      let combined = text;
      for (const doc of documents) {
        combined += `\n\n--- Attached document: ${doc.name} ---\n${doc.text}`;
      }
      if (!combined.trim()) continue;
      result.push({ role: message.role, content: combined.trim() });
      continue;
    }

    if (message.role !== 'user') {
      // Only user turns carry media; keep any text as-is.
      if (text) result.push({ role: message.role, content: text });
      continue;
    }

    const parts: ContentPart[] = [];
    let annotated = text;
    for (const doc of documents) {
      annotated += `\n\n--- Attached document: ${doc.name} ---\n${doc.text}`;
    }
    if (annotated.trim()) parts.push({ type: 'text', text: annotated.trim() });

    for (const item of media) {
      if (!item.dataUrl) {
        throw new ApiError('Attachment is missing its data.', {
          code: 'invalid_attachment',
          status: 400,
        });
      }
      const { mimeType, base64 } = parseDataUrl(item.dataUrl, maxBytes);
      const url = item.dataUrl.startsWith('data:')
        ? item.dataUrl
        : `data:${item.mimeType ?? mimeType};base64,${base64}`;

      if (item.kind === 'image') {
        parts.push({ type: 'image_url', image_url: { url } });
      } else if (config.provider.videoSupported) {
        parts.push({ type: 'video_url', video_url: { url } });
      } else {
        throw new ApiError(
          'Video analysis is not supported by the configured model yet. Try a photo or a document instead.',
          { code: 'video_not_supported', status: 415 }
        );
      }
    }

    result.push({ role: 'user', content: parts });
  }

  return result;
}

export interface ChatResult {
  content: string;
  usage?: unknown;
}

interface StreamOptions {
  messages: AppMessage[];
  onDelta?: (chunk: string) => void;
  signal?: AbortSignal;
  /** Override the model (e.g. a vision model for image analysis). */
  model?: string;
  /** User preferences injected into the system prompt. */
  instructions?: string;
  /** Preferred reply length: 'concise' | 'balanced' | 'detailed'. */
  style?: string;
  /** Override the entire system prompt (used by image analysis). */
  systemPrompt?: string;
}

const endpoint = (): string => `${config.provider.baseUrl}/chat/completions`;

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.provider.apiKey}`,
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;
    const message =
      parsed && typeof parsed === 'object'
        ? (parsed.error?.message ?? parsed.message)
        : undefined;
    if (typeof message === 'string' && message.length > 0) return message;
  } catch {
    // fall through to generic message
  }
  return `The AI provider returned status ${response.status}.`;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Backoff delay, honouring the provider's Retry-After header when present. */
function retryDelayMs(response: Response | undefined, attempt: number): number {
  const retryAfter = response?.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 8000);
    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) return Math.max(0, Math.min(date - Date.now(), 8000));
  }
  const base = config.provider.retryBaseMs * 2 ** attempt;
  return Math.min(base + Math.random() * 250, 8000);
}

/**
 * POSTs to the provider, retrying transient failures (429 rate limits and 5xx)
 * with exponential backoff. Safe because the body is not consumed until the
 * caller reads a successful response.
 */
async function requestProvider(body: string, signal?: AbortSignal): Promise<Response> {
  const maxRetries = config.provider.maxRetries;
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(endpoint(), {
        method: 'POST',
        headers: headers(),
        signal,
        body,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new ApiError('The request was cancelled.', { code: 'aborted', status: 499 });
      }
      if (attempt >= maxRetries) {
        throw new ApiError(
          'Could not reach the AI provider. Check the server network and provider URL.',
          { code: 'provider_unreachable', status: 502 }
        );
      }
      await sleep(retryDelayMs(undefined, attempt));
      continue;
    }

    if (RETRYABLE_STATUS.has(response.status) && attempt < maxRetries) {
      // Drain the body so the socket can be reused before retrying.
      await response.text().catch(() => {});
      await sleep(retryDelayMs(response, attempt));
      if (signal?.aborted) {
        throw new ApiError('The request was cancelled.', { code: 'aborted', status: 499 });
      }
      continue;
    }

    return response;
  }
}

/** Sends a chat completion, streaming deltas through `onDelta` when provided. */
export async function chat({
  messages,
  onDelta,
  signal,
  model,
  instructions,
  style,
  systemPrompt,
}: StreamOptions): Promise<ChatResult> {
  const effectivePrompt = systemPrompt ?? buildSystemPrompt(instructions, style);
  const providerMessages = await buildProviderMessages(messages, effectivePrompt);
  const stream = Boolean(onDelta);

  const body = JSON.stringify({
    model: model ?? config.provider.model,
    messages: providerMessages,
    temperature: config.provider.temperature,
    max_tokens: config.provider.maxTokens,
    stream,
  });

  const response = await requestProvider(body, signal);

  if (!response.ok) {
    if (response.status === 429) {
      throw new ApiError(
        'Jay AI is handling a lot of requests right now. Please wait a few seconds and try again.',
        { code: 'provider_rate_limited', status: 429 }
      );
    }
    throw new ApiError(await readErrorMessage(response), {
      code: 'provider_error',
      status: response.status,
    });
  }

  if (!stream) {
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: unknown;
    };
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) {
      throw new ApiError('The provider returned an empty response.', {
        code: 'empty_response',
        status: 502,
      });
    }
    return { content, usage: data.usage };
  }

  return consumeStream(response, onDelta!);
}

async function consumeStream(
  response: Response,
  onDelta: (chunk: string) => void
): Promise<ChatResult> {
  if (!response.body) {
    throw new ApiError('The provider did not return a stream.', {
      code: 'no_stream',
      status: 502,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const event = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = event.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        // Ignore malformed keep-alive lines.
      }
    }
  }

  if (!full.trim()) {
    throw new ApiError('The provider returned an empty response.', {
      code: 'empty_response',
      status: 502,
    });
  }
  return { content: full.trim() };
}
