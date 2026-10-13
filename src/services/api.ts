/**
 * Jay AI service layer.
 *
 * Every AI capability goes through this module. When a backend is
 * configured (`EXPO_PUBLIC_API_BASE_URL`), calls hit the real endpoints.
 * Otherwise the app runs in explicit mock mode and every result is labelled.
 *
 * Backend contract:
 *   GET  /health               -> provider status + capabilities
 *   POST /chat                 { messages, stream } -> SSE (delta/done/error) or { content }
 *   POST /vision/analyze       { image, question }  -> { id, answer, createdAt }
 *   POST /video/jobs           VideoRequest          -> VideoJob (honest 503 until wired)
 *   GET  /video/jobs/:id                                        -> VideoJob
 *   POST /images               ImageRequest           -> ImageResult
 *
 * The backend — never the client — owns credits, provider keys and job state.
 */

import EventSource from 'react-native-sse';

import { AppConfig, isMockMode } from '@/config';
import { ApiError, apiRequest } from '@/services/http';
import {
  createMockVideoJob,
  getMockVideoJob,
  mockChatReply,
  mockImageAnalysis,
  mockImageGeneration,
} from '@/services/mockProvider';
import { toPayload } from '@/services/attachments';
import type {
  AnalysisResult,
  ChatMessage,
  ImageRequest,
  ImageResult,
  SourceImage,
  VideoJob,
  VideoRequest,
} from '@/types';

export { ApiError } from '@/services/http';

export interface BackendHealth {
  ok: boolean;
  configured: boolean;
  model: string;
  visionModel: string;
  maxUploadMb: number;
  capabilities: { chat: boolean; vision: boolean; documents: boolean; video: boolean };
  mode: 'mock' | 'live';
}

export interface ChatStreamHandlers {
  onDelta: (chunk: string) => void;
  onDone: (fullText: string) => void;
  onError: (message: string) => void;
}

export interface ChatStreamHandle {
  /** Stops generation locally and tears down the network stream. */
  close: () => void;
}

export const usingMockProvider = (): boolean => isMockMode();

interface WireAttachment {
  kind: string;
  name?: string;
  mimeType?: string;
  dataUrl: string;
}

interface WireMessage {
  role: string;
  content: string;
  attachments?: WireAttachment[];
}

/** Converts chat messages (with local files) into the backend wire format. */
async function messagesToPayload(messages: ChatMessage[]): Promise<WireMessage[]> {
  const usable = messages.filter(
    (message) => message.role !== 'system' && (message.content.trim() || message.attachments?.length)
  );

  return Promise.all(
    usable.map(async (message) => ({
      role: message.role,
      content: message.content,
      attachments: message.attachments?.length
        ? await Promise.all(message.attachments.map(toPayload))
        : undefined,
    }))
  );
}

async function toDataUri(image: SourceImage): Promise<string> {
  if (image.uri.startsWith('data:') || image.uri.startsWith('http')) return image.uri;
  const response = await fetch(image.uri);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ApiError('Could not read the selected image.'));
    reader.readAsDataURL(blob);
  });
}

/** Server + provider status. Falls back to a synthetic mock report locally. */
export async function health(): Promise<BackendHealth> {
  if (isMockMode()) {
    return {
      ok: true,
      configured: false,
      model: 'mock',
      visionModel: 'mock',
      maxUploadMb: AppConfig.attachmentMaxMb,
      capabilities: { chat: false, vision: false, documents: false, video: false },
      mode: 'mock',
    };
  }
  const data = await apiRequest<Omit<BackendHealth, 'mode'>>('/health');
  return { ...data, mode: 'live' };
}

function requireBackend(): string {
  if (!AppConfig.apiBaseUrl) {
    throw new ApiError('No backend is configured. The app is running in mock mode.', {
      code: 'no_backend',
    });
  }
  return AppConfig.apiBaseUrl.replace(/\/+$/, '');
}

/**
 * Streams a chat completion as Server-Sent Events. Returns a handle so the UI
 * can stop generation. Always throws synchronously-awaitable errors as ApiError.
 */
async function streamChat(
  messages: ChatMessage[],
  handlers: ChatStreamHandlers,
  options?: { instructions?: string; style?: string }
): Promise<ChatStreamHandle> {
  if (isMockMode()) {
    return mockStream(messages, handlers);
  }

  const base = requireBackend();

  const status = await health();
  if (!status.configured) {
    throw new ApiError(
      'The AI backend is online but no provider key is configured. Add OPENAI_API_KEY on the server and restart.',
      { code: 'not_configured', status: 503 }
    );
  }

  const instructions = options?.instructions?.trim();
  const style = options?.style?.trim();
  const body = JSON.stringify({
    messages: await messagesToPayload(messages),
    stream: true,
    instructions: instructions ? instructions : undefined,
    style: style ? style : undefined,
  });
  let finished = false;
  let received = '';

  const source = new EventSource(`${base}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body,
    pollingInterval: 0,
  });

  const finish = (): void => {
    finished = true;
    try {
      source.removeAllEventListeners();
      source.close();
    } catch {
      // ignore teardown errors
    }
  };

  source.addEventListener('message', (event) => {
    if (!event.data) return;
    let payload: { type?: string; content?: string; message?: string };
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    if (payload.type === 'delta' && payload.content) {
      received += payload.content;
      handlers.onDelta(payload.content);
    } else if (payload.type === 'done') {
      const full = payload.content ?? received;
      finish();
      handlers.onDone(full);
    } else if (payload.type === 'error') {
      finish();
      handlers.onError(payload.message ?? 'The assistant could not complete the response.');
    }
  });

  source.addEventListener('error', (event) => {
    if (finished) return;
    finish();
    const detail =
      event && 'message' in event && typeof event.message === 'string' ? event.message : '';
    handlers.onError(
      detail || 'Unable to connect to Jay AI. Check the server URL and your network, then retry.'
    );
  });

  source.addEventListener('close', () => {
    if (finished) return;
    finish();
    if (received) handlers.onDone(received);
    else handlers.onError('The connection closed before a response arrived. Please retry.');
  });

  return {
    close: () => {
      if (finished) return;
      finish();
    },
  };
}

/** Simulates token streaming in mock mode so the UI is fully exercisable. */
function mockStream(messages: ChatMessage[], handlers: ChatStreamHandlers): ChatStreamHandle {
  const full = mockChatReply(messages);
  const tokens = full.match(/\S+\s*/g) ?? [full];
  let index = 0;
  let done = false;
  let aggregate = '';

  const timer = setInterval(() => {
    if (done) return;
    if (index < tokens.length) {
      aggregate += tokens[index];
      handlers.onDelta(tokens[index]);
      index += 1;
    } else {
      done = true;
      clearInterval(timer);
      handlers.onDone(aggregate || full);
    }
  }, 28);

  return {
    close: () => {
      done = true;
      clearInterval(timer);
    },
  };
}

export const ai = {
  mode(): 'mock' | 'live' {
    return isMockMode() ? 'mock' : 'live';
  },

  health,

  streamChat,

  /** Non-streaming fallback (used when streaming is unavailable). */
  async sendChatMessage(messages: ChatMessage[]): Promise<{ content: string; mock: boolean }> {
    if (isMockMode()) {
      await delay(500);
      return { content: mockChatReply(messages), mock: true };
    }
    requireBackend();
    const data = await apiRequest<{ content: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: await messagesToPayload(messages), stream: false }),
    });
    return { content: data.content, mock: false };
  },

  async createVideoJob(request: VideoRequest): Promise<VideoJob> {
    if (isMockMode()) {
      await delay(300);
      return createMockVideoJob(request);
    }
    return apiRequest<VideoJob>('/video/jobs', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async getVideoJob(id: string): Promise<VideoJob> {
    if (isMockMode()) {
      const job = getMockVideoJob(id);
      if (!job) throw new ApiError('Video job not found.', { code: 'not_found' });
      return job;
    }
    return apiRequest<VideoJob>(`/video/jobs/${encodeURIComponent(id)}`);
  },

  async generateImage(request: ImageRequest): Promise<ImageResult> {
    if (isMockMode()) {
      await delay(900);
      return mockImageGeneration(request);
    }
    return apiRequest<ImageResult>('/images', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async analyzeImage(image: SourceImage, question: string): Promise<AnalysisResult> {
    if (isMockMode()) {
      await delay(700);
      return mockImageAnalysis(image.uri, question);
    }
    const dataUri = await toDataUri(image);
    const data = await apiRequest<{ id: string; answer: string; createdAt: string }>(
      '/vision/analyze',
      {
        method: 'POST',
        body: JSON.stringify({ image: dataUri, question }),
      }
    );
    return {
      id: data.id,
      imageUri: image.uri,
      question,
      answer: data.answer,
      mock: false,
      createdAt: data.createdAt,
    };
  },
} as const;

export const backendStatus = {
  configured: Boolean(AppConfig.apiBaseUrl),
  baseUrl: AppConfig.apiBaseUrl,
} as const;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
