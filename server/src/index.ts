import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { authRouter, optionalAuth } from './auth.js';
import { config, capabilities, providerConfigured, visionModel } from './config.js';
import { ApiError } from './errors.js';
import { chat, type AppMessage } from './provider.js';
import type { IncomingAttachment } from './attachments.js';

const app = express();

app.disable('x-powered-by');
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()),
  })
);
app.use(express.json({ limit: `${config.maxUploadMb + 5}mb` }));

const MAX_ATTACHMENTS = 8;
const ALLOWED_ROLES = new Set(['user', 'assistant', 'system']);
const ALLOWED_KINDS = new Set(['image', 'video', 'document']);

function validateMessages(value: unknown): AppMessage[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError('A non-empty "messages" array is required.', {
      code: 'invalid_request',
      status: 400,
    });
  }

  let attachmentCount = 0;
  const messages: AppMessage[] = value.map((raw) => {
    if (!raw || typeof raw !== 'object') {
      throw new ApiError('Each message must be an object.', { code: 'invalid_request', status: 400 });
    }
    const { role, content, attachments } = raw as Record<string, unknown>;
    if (typeof role !== 'string' || !ALLOWED_ROLES.has(role)) {
      throw new ApiError(`Invalid message role "${String(role)}".`, {
        code: 'invalid_request',
        status: 400,
      });
    }
    if (typeof content !== 'string') {
      throw new ApiError('Each message needs string content.', {
        code: 'invalid_request',
        status: 400,
      });
    }

    let parsedAttachments: IncomingAttachment[] | undefined;
    if (Array.isArray(attachments) && attachments.length > 0) {
      parsedAttachments = attachments.map((item) => {
        if (!item || typeof item !== 'object') {
          throw new ApiError('Invalid attachment.', { code: 'invalid_request', status: 400 });
        }
        const att = item as Record<string, unknown>;
        if (typeof att.kind !== 'string' || !ALLOWED_KINDS.has(att.kind)) {
          throw new ApiError('Attachment kind must be image, video or document.', {
            code: 'invalid_request',
            status: 400,
          });
        }
        if (typeof att.dataUrl !== 'string' || !att.dataUrl.startsWith('data:')) {
          throw new ApiError('Attachment is missing its data URL.', {
            code: 'invalid_attachment',
            status: 400,
          });
        }
        attachmentCount += 1;
        if (attachmentCount > MAX_ATTACHMENTS) {
          throw new ApiError(`At most ${MAX_ATTACHMENTS} attachments are allowed per message.`, {
            code: 'too_many_attachments',
            status: 413,
          });
        }
        return {
          kind: att.kind as IncomingAttachment['kind'],
          name: typeof att.name === 'string' ? att.name : undefined,
          mimeType: typeof att.mimeType === 'string' ? att.mimeType : undefined,
          dataUrl: att.dataUrl,
        };
      });
    }

    return {
      role: role as AppMessage['role'],
      content,
      attachments: parsedAttachments,
    };
  });

  return messages;
}

function requireProvider(): void {
  if (!providerConfigured()) {
    throw new ApiError(
      'The AI backend is running but no provider key is set. Add OPENAI_API_KEY (or a compatible provider) to server/.env and restart.',
      { code: 'not_configured', status: 503 }
    );
  }
}

/** Account registration, login and identity. */
app.use('/auth', authRouter);

/** Server + provider status. Never exposes secrets. */
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    configured: providerConfigured(),
    model: config.provider.model,
    visionModel: visionModel(),
    capabilities: capabilities(),
    maxUploadMb: config.maxUploadMb,
  });
});

/**
 * Chat completion. Streams Server-Sent Events by default ({"type":"delta"|"done"|"error"}),
 * or returns JSON when `stream: false`.
 */
app.post('/chat', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireProvider();
    const messages = validateMessages(req.body?.messages);
    const wantsStream = req.body?.stream !== false;
    const instructions =
      typeof req.body?.instructions === 'string' ? req.body.instructions : undefined;
    const style = typeof req.body?.style === 'string' ? req.body.style : undefined;

    const controller = new AbortController();
    res.on('close', () => controller.abort());

    if (!wantsStream) {
      const result = await chat({ messages, signal: controller.signal, instructions, style });
      res.json({ content: result.content });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const write = (payload: unknown) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    try {
      const result = await chat({
        messages,
        signal: controller.signal,
        onDelta: (chunk) => write({ type: 'delta', content: chunk }),
        instructions,
        style,
      });
      write({ type: 'done', content: result.content });
    } catch (error) {
      if (!controller.signal.aborted) {
        const message =
          error instanceof ApiError ? error.message : 'The assistant failed to respond.';
        write({ type: 'error', message });
      }
    }
    res.end();
  } catch (error) {
    next(error);
  }
});

/** Image understanding via the configured vision model. */
app.post('/vision/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireProvider();
    const image = req.body?.image;
    const question = typeof req.body?.question === 'string' ? req.body.question : '';
    if (typeof image !== 'string' || !image.startsWith('data:')) {
      throw new ApiError('A base64 "image" data URL is required.', {
        code: 'invalid_request',
        status: 400,
      });
    }

    const messages: AppMessage[] = [
      {
        role: 'user',
        content: question.trim() || 'Describe this image in detail.',
        attachments: [{ kind: 'image', dataUrl: image }],
      },
    ];

    const result = await chat({ messages, model: visionModel() });
    res.json({
      id: `ana_${Date.now().toString(36)}`,
      answer: result.content,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Video and image generation are not wired to a provider yet. This endpoint
 * reports that honestly instead of returning fabricated media.
 */
function notImplemented(capability: string): never {
  throw new ApiError(
    `${capability} is not connected to a provider yet. Configure a generation provider on the server to enable it.`,
    { code: 'not_configured', status: 503 }
  );
}

app.post('/video/jobs', (_req, _res, next) => {
  try {
    notImplemented('Video generation');
  } catch (error) {
    next(error);
  }
});

app.get('/video/jobs/:id', (_req, _res, next) => {
  try {
    notImplemented('Video generation');
  } catch (error) {
    next(error);
  }
});

app.post('/images', (_req, _res, next) => {
  try {
    notImplemented('Image generation');
  } catch (error) {
    next(error);
  }
});

app.use((_req, _res, next) => {
  next(new ApiError('Not found.', { code: 'not_found', status: 404 }));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const apiError =
    error instanceof ApiError
      ? error
      : new ApiError((error as Error)?.message || 'Unexpected server error.', {
          code: 'internal_error',
          status: 500,
        });
  if (apiError.status >= 500) {
    // Log the message only — never tokens, keys or request bodies.
    console.error(`[jay-ai-server] ${apiError.code}: ${apiError.message}`);
  }
  res.status(apiError.status).json({ message: apiError.message, code: apiError.code });
});

app.listen(config.port, () => {
  console.log(`Jay AI server listening on http://0.0.0.0:${config.port}`);
  console.log(
    providerConfigured()
      ? `Provider configured · model=${config.provider.model} · base=${config.provider.baseUrl}`
      : 'No provider key set — /chat will return 503 until OPENAI_API_KEY is configured.'
  );
});
