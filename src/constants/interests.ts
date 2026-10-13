import type { IconName } from '@/components/ui';

export interface Interest {
  value: string;
  label: string;
  icon: IconName;
}

/** Interests shown during personalization. Values are persisted; labels shown. */
export const INTERESTS: Interest[] = [
  { value: 'coding', label: 'Coding', icon: 'code' },
  { value: 'writing', label: 'Writing', icon: 'notebook-pen' },
  { value: 'images', label: 'Image Generation', icon: 'images' },
  { value: 'video', label: 'Video Creation', icon: 'videocam' },
  { value: 'research', label: 'Research', icon: 'search' },
  { value: 'documents', label: 'Document Analysis', icon: 'file-text' },
  { value: 'voice', label: 'Voice & Audio', icon: 'mic' },
  { value: 'business', label: 'Business', icon: 'wallet-outline' },
  { value: 'learning', label: 'Learning', icon: 'sparkles' },
  { value: 'productivity', label: 'Productivity', icon: 'checkmark-circle' },
];

/** Maps stored interest values back to human labels. */
export function interestLabels(values: readonly string[]): string[] {
  return values
    .map((value) => INTERESTS.find((interest) => interest.value === value)?.label ?? value)
    .filter(Boolean);
}
