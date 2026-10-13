import { ApiError } from './errors.js';

export type AttachmentKind = 'image' | 'video' | 'document';

export interface IncomingAttachment {
  kind: AttachmentKind;
  /** Optional original filename, used for context and mime detection. */
  name?: string;
  mimeType?: string;
  /** Base64 data URL, e.g. `data:image/png;base64,....`. */
  dataUrl?: string;
}

export interface ParsedDataUrl {
  mimeType: string;
  buffer: Buffer;
  base64: string;
}

const TEXT_MIME = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'text/html',
]);

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME = 'application/pdf';

const EXTENSION_MIME: Record<string, string> = {
  pdf: PDF_MIME,
  docx: DOCX_MIME,
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

export function parseDataUrl(dataUrl: string, maxBytes: number): ParsedDataUrl {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new ApiError('Attachment is not a valid data URL.', { code: 'invalid_attachment', status: 400 });
  }
  const mimeType = match[1] || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? '';

  const base64 = isBase64 ? payload : Buffer.from(decodeURIComponent(payload)).toString('base64');
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.byteLength === 0) {
    throw new ApiError('Attachment is empty.', { code: 'invalid_attachment', status: 400 });
  }
  if (buffer.byteLength > maxBytes) {
    throw new ApiError(
      `Attachment exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit.`,
      { code: 'attachment_too_large', status: 413 }
    );
  }
  return { mimeType, buffer, base64 };
}

function mimeFor(attachment: IncomingAttachment): string {
  if (attachment.mimeType) return attachment.mimeType.toLowerCase();
  const ext = attachment.name?.split('.').pop()?.toLowerCase();
  return (ext && EXTENSION_MIME[ext]) || 'application/octet-stream';
}

function decodeText(buffer: Buffer): string {
  return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // Import the inner module directly to avoid pdf-parse's debug branch that
  // reads a test fixture when `module.parent` is undefined under ESM loaders.
  const mod = (await import('pdf-parse/lib/pdf-parse.js')) as unknown as {
    default: (data: Buffer) => Promise<{ text: string }>;
  };
  const result = await mod.default(buffer);
  return result.text ?? '';
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = (await import('mammoth')).default as {
    extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>;
  };
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? '';
}

export interface ExtractedDocument {
  text: string;
  name: string;
}

/**
 * Converts document attachments into plain text the model can read.
 * Images/videos are skipped here — they are forwarded as provider content parts.
 */
export async function extractDocuments(
  attachments: IncomingAttachment[],
  maxBytes: number
): Promise<ExtractedDocument[]> {
  const documents: ExtractedDocument[] = [];

  for (const attachment of attachments) {
    if (attachment.kind !== 'document') continue;
    if (!attachment.dataUrl) {
      throw new ApiError('Document attachment is missing its data.', {
        code: 'invalid_attachment',
        status: 400,
      });
    }

    const { buffer, mimeType } = parseDataUrl(attachment.dataUrl, maxBytes);
    const resolvedMime = attachment.mimeType ? mimeFor(attachment) : mimeType;
    const name = attachment.name ?? 'document';

    try {
      if (resolvedMime === PDF_MIME) {
        documents.push({ text: sanitize(await extractPdf(buffer)), name });
      } else if (resolvedMime === DOCX_MIME) {
        documents.push({ text: sanitize(await extractDocx(buffer)), name });
      } else if (TEXT_MIME.has(resolvedMime) || resolvedMime.startsWith('text/')) {
        documents.push({ text: sanitize(decodeText(buffer)), name });
      } else {
        throw new ApiError(
          `Unsupported document type "${resolvedMime}". Supported: PDF, DOCX, TXT, MD, CSV, JSON.`,
          { code: 'unsupported_document', status: 415 }
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(`Could not read "${name}". The file may be corrupted or password-protected.`, {
        code: 'document_parse_failed',
        status: 422,
      });
    }
  }

  return documents;
}

function sanitize(text: string): string {
  // Collapse excessive whitespace and cap very long documents.
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 200_000);
}
