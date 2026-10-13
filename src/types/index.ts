/**
 * Shared domain types for Jay AI.
 *
 * These types describe the frontend contract with the (future) backend.
 * Keeping them in one place lets the mock provider and the real API
 * service implement the same shapes.
 */

export type Id = string;

/** ISO-8601 timestamp string. */
export type Timestamp = string;

export type VideoStyle = 'cinematic' | 'advertisement' | 'documentary';
export type VideoDuration = 10 | 15 | 20;
export type SceneCount = 2 | 3 | 4;
export type AspectRatio = '16:9' | '9:16' | '1:1';
export type ImageStyle = 'realistic' | 'cinematic' | 'anime' | 'digital-art' | '3d-render';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type CreationKind = 'video' | 'image' | 'chat';

export interface SourceImage {
  uri: string;
  width?: number;
  height?: number;
  mimeType?: string;
  fileName?: string;
}

export type AttachmentKind = 'image' | 'video' | 'document';

/** A file the user attached to a chat message. Stored locally by URI. */
export interface ChatAttachment {
  id: Id;
  kind: AttachmentKind;
  uri: string;
  name?: string;
  mimeType?: string;
  /** Size in bytes, when the picker reports it. */
  size?: number;
  width?: number;
  height?: number;
}

export interface ChatMessage {
  id: Id;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Timestamp;
  status?: 'sending' | 'streaming' | 'sent' | 'error';
  /** True when the message came from the local mock provider. */
  mock?: boolean;
  /** Files sent alongside this message (user turns only). */
  attachments?: ChatAttachment[];
  /** Human-readable reason a message failed, for the retry affordance. */
  error?: string;
}

export interface ChatConversation {
  id: Id;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  messages: ChatMessage[];
}

/** Payload submitted from the Video Studio form. */
export interface VideoRequest {
  prompt: string;
  style: VideoStyle;
  durationSeconds: VideoDuration;
  sceneCount: SceneCount;
  aspectRatio: AspectRatio;
  characterDescription?: string;
  referenceImage?: SourceImage | null;
}

export interface VideoJob {
  id: Id;
  request: VideoRequest;
  status: JobStatus;
  /** 0..1 progress reported by the provider (or simulated in mock mode). */
  progress: number;
  /** Human readable pipeline stage, e.g. "Scene planning". */
  stage: string;
  estimatedCredits: number;
  /** Only present when a real, playable result exists. */
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  /** True when produced by the local mock provider. */
  mock: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ImageRequest {
  prompt: string;
  style: ImageStyle;
  aspectRatio: AspectRatio;
  count?: number;
}

export interface ImageResult {
  id: Id;
  request: ImageRequest;
  status: JobStatus;
  images: string[];
  error?: string;
  mock: boolean;
  createdAt: Timestamp;
}

export interface AnalysisResult {
  id: Id;
  imageUri: string;
  question: string;
  answer: string;
  error?: string;
  mock: boolean;
  createdAt: Timestamp;
}

export type Creation =
  | { kind: 'video'; id: Id; title: string; createdAt: Timestamp; job: VideoJob }
  | { kind: 'image'; id: Id; title: string; createdAt: Timestamp; image: ImageResult }
  | { kind: 'analysis'; id: Id; title: string; createdAt: Timestamp; analysis: AnalysisResult }
  | {
      kind: 'chat';
      id: Id;
      title: string;
      createdAt: Timestamp;
      updatedAt: Timestamp;
      messages: ChatMessage[];
    };

export type CreditTransactionType = 'grant' | 'spend' | 'refund';

export interface CreditTransaction {
  id: Id;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: Timestamp;
  mock?: boolean;
}

export interface UserProfile {
  id: Id;
  displayName: string;
  email?: string;
  plan: 'free' | 'pro';
  avatarUrl?: string;
}

export interface ApiErrorShape {
  message: string;
  code?: string;
  status?: number;
}
