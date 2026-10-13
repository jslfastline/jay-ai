import type {
  AspectRatio,
  ImageRequest,
  ImageStyle,
  SceneCount,
  VideoDuration,
  VideoRequest,
  VideoStyle,
} from '@/types';

/**
 * Credit calculation rules.
 *
 * These are the *client-side estimates only*. The backend is the single
 * source of truth for the actual charge and final balance. The whole
 * pointer of `estimate*` functions is to show the user a transparent,
 * pre-flight cost before they commit.
 */

export const CREDIT_RULES = {
  video: {
    /** Base cost for a single 10s, 2-scene clip. */
    base: 40,
    /** Extra cost per additional second beyond the base 10s. */
    perSecond: 3,
    /** Extra cost per scene beyond the base 2 scenes. */
    perScene: 15,
    /** Surcharge for high-resolution / non-landscape aspect ratios. */
    aspectSurcharge: {
      '16:9': 0,
      '9:16': 5,
      '1:1': 5,
    },
  },
  image: {
    base: 6,
    perImage: 6,
    styleSurcharge: {
      realistic: 0,
      cinematic: 2,
      anime: 0,
      'digital-art': 0,
      '3d-render': 3,
    },
  },
  chat: {
    /** Estimated cost per message turn. */
    perMessage: 1,
  },
} as const;

const BASE_DURATION: VideoDuration = 10;
const BASE_SCENES: SceneCount = 2;

export interface VideoCostBreakdown {
  base: number;
  duration: number;
  scenes: number;
  aspect: number;
  total: number;
}

export function estimateVideoCost(
  durationSeconds: VideoDuration,
  sceneCount: SceneCount,
  aspectRatio: AspectRatio,
  style: VideoStyle
): VideoCostBreakdown {
  const rules = CREDIT_RULES.video;
  const base = rules.base;
  const duration = Math.max(0, durationSeconds - BASE_DURATION) * rules.perSecond;
  const scenes = Math.max(0, sceneCount - BASE_SCENES) * rules.perScene;
  const aspect = rules.aspectSurcharge[aspectRatio] ?? 0;
  // Cinematic renders carry a small premium; documented for transparency.
  const stylePremium = style === 'cinematic' ? 4 : 0;

  return {
    base,
    duration,
    scenes,
    aspect,
    total: base + duration + scenes + aspect + stylePremium,
  };
}

export function estimateVideoCredits(request: Pick<VideoRequest, 'durationSeconds' | 'sceneCount' | 'aspectRatio' | 'style'>): number {
  return estimateVideoCost(
    request.durationSeconds,
    request.sceneCount,
    request.aspectRatio,
    request.style
  ).total;
}

export function estimateImageCredits(style: ImageStyle, count = 1): number {
  const rules = CREDIT_RULES.image;
  const surcharge = rules.styleSurcharge[style] ?? 0;
  return (rules.base + surcharge) * Math.max(1, count);
}

export function estimateImageRequestCredits(request: ImageRequest): number {
  return estimateImageCredits(request.style, request.count ?? 1);
}

export function estimateChatCredits(): number {
  return CREDIT_RULES.chat.perMessage;
}

export function formatCredits(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}
