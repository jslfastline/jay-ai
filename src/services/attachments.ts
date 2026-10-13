import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { AppConfig } from '@/config';
import type { AttachmentKind, ChatAttachment } from '@/types';
import { createId } from '@/utils/format';

export interface PickOutcome {
  attachments: ChatAttachment[];
  error?: string;
}

/** Wire format sent to the backend (base64 data URL). */
export interface AttachmentPayload {
  kind: AttachmentKind;
  name?: string;
  mimeType?: string;
  dataUrl: string;
}

const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/*',
];

const EXTENSION_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

function mimeFromName(name?: string): string | undefined {
  const ext = name?.split('.').pop()?.toLowerCase();
  return ext ? EXTENSION_MIME[ext] : undefined;
}

function toAttachment(kind: AttachmentKind, asset: {
  uri: string;
  fileName?: string | null;
  name?: string;
  mimeType?: string | null;
  fileSize?: number;
  size?: number;
  width?: number;
  height?: number;
}): ChatAttachment {
  const name = asset.fileName ?? asset.name ?? undefined;
  return {
    id: createId('att'),
    kind,
    uri: asset.uri,
    name,
    mimeType: asset.mimeType ?? mimeFromName(name),
    size: asset.fileSize ?? asset.size,
    width: asset.width,
    height: asset.height,
  };
}

export function humanFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function withinLimit(attachment: ChatAttachment): string | undefined {
  const maxBytes = AppConfig.attachmentMaxMb * 1024 * 1024;
  if (attachment.size && attachment.size > maxBytes) {
    return `"${attachment.name ?? 'File'}" is larger than ${AppConfig.attachmentMaxMb} MB.`;
  }
  return undefined;
}

/** Photo library — images (optionally multiple). */
export async function pickImages(multiple = true): Promise<PickOutcome> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { attachments: [], error: 'Photo library permission is required to attach images.' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? AppConfig.maxAttachmentsPerMessage : 1,
    quality: 0.7,
  });
  if (result.canceled) return { attachments: [] };

  const attachments = result.assets.map((asset) => toAttachment('image', asset));
  const oversize = attachments.find((a) => withinLimit(a));
  if (oversize) return { attachments: [], error: withinLimit(oversize) };
  return { attachments };
}

/** Photo library — a single video. */
export async function pickVideo(): Promise<PickOutcome> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { attachments: [], error: 'Photo library permission is required to attach a video.' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    quality: 0.8,
  });
  if (result.canceled) return { attachments: [] };
  const attachment = toAttachment('video', result.assets[0]);
  const oversize = withinLimit(attachment);
  if (oversize) return { attachments: [], error: oversize };
  return { attachments: [attachment] };
}

/** Camera capture. */
export async function takePhoto(): Promise<PickOutcome> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { attachments: [], error: 'Camera permission is required to take a photo.' };
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (result.canceled) return { attachments: [] };
  const attachment = toAttachment('image', result.assets[0]);
  const oversize = withinLimit(attachment);
  if (oversize) return { attachments: [], error: oversize };
  return { attachments: [attachment] };
}

/** Documents (PDF, DOCX, TXT, MD, CSV, JSON). */
export async function pickDocument(): Promise<PickOutcome> {
  const result = await DocumentPicker.getDocumentAsync({
    type: DOCUMENT_TYPES,
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (result.canceled) return { attachments: [] };

  const attachments = result.assets.map((asset) => toAttachment('document', asset));
  const oversize = attachments.find((a) => withinLimit(a));
  if (oversize) return { attachments: [], error: withinLimit(oversize) };
  return { attachments };
}

/** Reads a local file into a base64 data URL for transport. */
export async function toPayload(attachment: ChatAttachment): Promise<AttachmentPayload> {
  const base64 = await FileSystem.readAsStringAsync(attachment.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const mimeType =
    attachment.mimeType ?? mimeFromName(attachment.name) ?? 'application/octet-stream';
  return {
    kind: attachment.kind,
    name: attachment.name,
    mimeType,
    dataUrl: `data:${mimeType};base64,${base64}`,
  };
}

export const attachmentService = {
  pickImages,
  pickVideo,
  takePhoto,
  pickDocument,
  toPayload,
  humanFileSize,
} as const;
