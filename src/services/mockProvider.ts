/**
 * Mock provider.
 *
 * This is the ONLY place that fabricates content. Every result is explicitly
 * flagged with `mock: true` and phrased so the UI can label it as a
 * development placeholder. It performs no network calls except loading
 * public placeholder media so the UI has something to render.
 *
 * Switch to a real backend by setting EXPO_PUBLIC_API_BASE_URL (see config).
 */

import { AppConfig } from '@/config';
import type {
  AnalysisResult,
  ChatMessage,
  ImageRequest,
  ImageResult,
  VideoJob,
  VideoRequest,
} from '@/types';
import { createId, nowIso, titleFromPrompt } from '@/utils/format';
import { estimateVideoCredits, estimateImageRequestCredits } from '@/utils/credits';

const VIDEO_SIMULATION_MS = 14_000;

const MOCK_STAGES: { until: number; stage: string }[] = [
  { until: 0.12, stage: 'Writing script' },
  { until: 0.3, stage: 'Planning scenes' },
  { until: 0.5, stage: 'Preparing references' },
  { until: 0.85, stage: 'Generating video' },
  { until: 1, stage: 'Assembling final cut' },
];

const MOCK_VIDEO_SAMPLE_URL =
  process.env.EXPO_PUBLIC_MOCK_SAMPLE_VIDEO_URL?.trim() ||
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

const jobs = new Map<string, { job: VideoJob; startedAt: number }>();

function stageForProgress(progress: number): string {
  return MOCK_STAGES.find((entry) => progress <= entry.until)?.stage ?? 'Assembling final cut';
}

export function mockChatReply(messages: ChatMessage[]): string {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  const quoted = lastUser ? `"${lastUser.content.slice(0, 120)}"` : 'your message';
  return (
    `[Development mock] I received ${quoted}. ` +
    'No language model is connected yet, so this is a placeholder response. ' +
    'Set EXPO_PUBLIC_API_BASE_URL and route chat through your backend to get real answers.'
  );
}

export function mockImageGeneration(request: ImageRequest): ImageResult {
  const count = Math.max(1, Math.min(request.count ?? 1, 4));
  const seed = encodeURIComponent(`${request.prompt.slice(0, 24)}-${Date.now()}`);
  const images = AppConfig.mockShowPlaceholderImages
    ? Array.from({ length: count }, (_, index) =>
        `https://picsum.photos/seed/${seed}-${index}/768/768`
      )
    : [];

  return {
    id: createId('img'),
    request,
    status: 'completed',
    images,
    mock: true,
    error: images.length === 0 ? 'Placeholder images are disabled in this build.' : undefined,
    createdAt: nowIso(),
  };
}

export function createMockVideoJob(request: VideoRequest): VideoJob {
  const id = createId('vid');
  const timestamp = nowIso();
  const job: VideoJob = {
    id,
    request,
    status: 'queued',
    progress: 0,
    stage: 'Queued',
    estimatedCredits: estimateVideoCredits(request),
    mock: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  jobs.set(id, { job, startedAt: Date.now() });
  return job;
}

export function getMockVideoJob(id: string): VideoJob | null {
  const entry = jobs.get(id);
  if (!entry) return null;

  const elapsed = Date.now() - entry.startedAt;
  const progress = Math.max(0, Math.min(1, elapsed / VIDEO_SIMULATION_MS));
  const status = progress >= 1 ? 'completed' : progress <= 0 ? 'queued' : 'processing';

  const updated: VideoJob = {
    ...entry.job,
    status,
    progress,
    stage: status === 'completed' ? 'Ready (mock sample)' : stageForProgress(progress),
    videoUrl: status === 'completed' ? MOCK_VIDEO_SAMPLE_URL : undefined,
    updatedAt: nowIso(),
  };

  entry.job = updated;
  return updated;
}

export function getMockVideoJobs(): VideoJob[] {
  return Array.from(jobs.values())
    .map((entry) => entry.job)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function mockImageAnalysis(imageUri: string, question: string): AnalysisResult {
  return {
    id: createId('ana'),
    imageUri,
    question,
    answer:
      '[Development mock] Image received, but no vision model is connected. ' +
      `Your question was: "${question || 'describe this image'}". ` +
      'Connect a vision-capable backend to receive a real analysis.',
    mock: true,
    createdAt: nowIso(),
  };
}

export function mockImageTitle(request: ImageRequest): string {
  return titleFromPrompt(request.prompt);
}

export function mockImageEstimatedCredits(request: ImageRequest): number {
  return estimateImageRequestCredits(request);
}
