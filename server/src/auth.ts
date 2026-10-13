import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Router, type NextFunction, type Request, type Response } from 'express';

import { config, emailConfigured } from './config.js';
import { ApiError } from './errors.js';
import { sendVerificationEmail } from './mailer.js';

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(here, '..', 'data');
const USERS_FILE = resolve(DATA_DIR, 'users.json');

export interface PublicUser {
  id: string;
  displayName: string;
  email: string;
  plan: 'free' | 'pro';
  createdAt: string;
  verified: boolean;
}

interface StoredUser extends PublicUser {
  passwordHash: string;
  /** Hash of the (dev-friendly) short code, if one was issued. */
  verifyCodeHash?: string;
  /** Hash of the token embedded in the emailed verification link. */
  verifyTokenHash?: string;
  /** Hash of the secret handed to the app so it can poll verification status. */
  pairingSecretHash?: string;
  verifyExpiresAt?: number;
  verifyAttempts?: number;
}

/** Resolves the JWT secret, generating an ephemeral one for local development. */
let cachedSecret: string | null = null;
function secret(): string {
  if (config.auth.jwtSecret) return config.auth.jwtSecret;
  if (!cachedSecret) {
    cachedSecret = randomBytes(48).toString('hex');
    console.warn(
      '[jay-ai-server] JWT_SECRET is not set — using an ephemeral secret. ' +
        'Tokens are invalidated on restart. Set JWT_SECRET in server/.env for production.'
    );
  }
  return cachedSecret;
}

function loadUsers(): StoredUser[] {
  try {
    if (!existsSync(USERS_FILE)) return [];
    const raw = readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function toPublic(user: StoredUser): PublicUser {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    plan: user.plan,
    createdAt: user.createdAt,
    verified: user.verified,
  };
}

/** Hashes a short verification secret. Values are hashed with a server pepper. */
function hashCode(value: string): string {
  return createHash('sha256').update(`${value}:${secret()}`).digest('hex');
}

function generateCode(length = 6): string {
  let code = '';
  for (let index = 0; index < length; index += 1) code += String(randomInt(0, 10));
  return code;
}

/**
 * Only expose the raw code in non-production, and only when the email could not
 * be delivered (unset provider or a send failure) — so nobody gets locked out.
 */
function devCode(code: string, delivered: boolean): string | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;
  return !emailConfigured() || !delivered ? code : undefined;
}

interface IssuedVerification {
  delivered: boolean;
  reason?: string;
  code: string;
  pairingSecret: string;
  expiresInMinutes: number;
}

/**
 * Issues a fresh verification challenge: a clickable link token (used by the
 * email template), a short code (convenience / dev fallback) and a pairing
 * secret shared only with the originating app so it can poll for completion.
 */
async function issueVerification(user: StoredUser, users: StoredUser[]): Promise<IssuedVerification> {
  const code = generateCode();
  const token = randomBytes(32).toString('hex');
  const pairingSecret = randomBytes(32).toString('hex');

  user.verifyCodeHash = hashCode(code);
  user.verifyTokenHash = hashCode(token);
  user.pairingSecretHash = hashCode(pairingSecret);
  user.verifyExpiresAt = Date.now() + config.auth.verifyTtlMinutes * 60_000;
  user.verifyAttempts = 0;
  saveUsers(users);

  const link = `${config.publicBaseUrl}/auth/verify?token=${token}`;
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[jay-ai-server] Verification link for ${user.email}: ${link}`);
  }
  const result = await sendVerificationEmail({
    to: user.email,
    name: user.displayName,
    code,
    link,
    expiresInMinutes: config.auth.verifyTtlMinutes,
  });

  return {
    delivered: result.delivered,
    reason: result.reason,
    code,
    pairingSecret,
    expiresInMinutes: config.auth.verifyTtlMinutes,
  };
}

/** Verifies a user in-place and clears any pending challenge state. */
function markVerified(user: StoredUser): void {
  user.verified = true;
  user.verifyCodeHash = undefined;
  user.verifyTokenHash = undefined;
  user.verifyExpiresAt = undefined;
  user.verifyAttempts = 0;
}

function renderPage(title: string, message: string, ok: boolean): string {
  const accent = ok ? '#3880f8' : '#f59e0b';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title></head>
<body style="margin:0;background:#020617;color:#f8fafc;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
<div style="max-width:420px;text-align:center;background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:40px 32px;">
<div style="width:56px;height:56px;margin:0 auto 20px;border-radius:16px;background:${accent};"></div>
<h1 style="margin:0 0 12px;font-size:24px;">${title}</h1>
<p style="margin:0;color:#94a3b8;line-height:1.6;">${message}</p>
</div></div></body></html>`;
}

function normaliseEmail(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ApiError('An email address is required.', { code: 'invalid_email', status: 400 });
  }
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError('Enter a valid email address.', { code: 'invalid_email', status: 400 });
  }
  return email;
}

function readPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 6) {
    throw new ApiError('Password must be at least 6 characters.', {
      code: 'weak_password',
      status: 400,
    });
  }
  return value;
}

function readDisplayName(value: unknown, fallbackEmail: string): string {
  const name = typeof value === 'string' ? value.trim() : '';
  return name.length > 0 ? name.slice(0, 60) : fallbackEmail.split('@')[0];
}

function issueToken(user: PublicUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, secret(), {
    expiresIn: config.auth.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export interface AuthedRequest extends Request {
  user?: PublicUser;
}

/** Verifies a Bearer token; attaches the user when present. */
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    next(new ApiError('Authentication required.', { code: 'unauthorized', status: 401 }));
    return;
  }
  try {
    const payload = jwt.verify(token, secret()) as { sub?: string };
    const user = loadUsers().find((candidate) => candidate.id === payload.sub);
    if (!user) {
      next(new ApiError('Your session is no longer valid.', { code: 'unauthorized', status: 401 }));
      return;
    }
    req.user = toPublic(user);
    next();
  } catch {
    next(new ApiError('Your session has expired. Please sign in again.', {
      code: 'unauthorized',
      status: 401,
    }));
  }
}

/** Optional auth: attaches the user when a valid token is supplied, else continues. */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    next();
    return;
  }
  try {
    const payload = jwt.verify(token, secret()) as { sub?: string };
    const user = loadUsers().find((candidate) => candidate.id === payload.sub);
    if (user) req.user = toPublic(user);
  } catch {
    // Ignore invalid tokens on optional routes.
  }
  next();
}

export const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = normaliseEmail(req.body?.email);
    const password = readPassword(req.body?.password);
    const displayName = readDisplayName(req.body?.displayName, email);

    const users = loadUsers();
    if (users.some((user) => user.email === email)) {
      throw new ApiError('An account with this email already exists.', {
        code: 'email_taken',
        status: 409,
      });
    }

    const user: StoredUser = {
      id: `usr_${randomUUID()}`,
      displayName,
      email,
      plan: 'free',
      createdAt: new Date().toISOString(),
      verified: false,
      passwordHash: await bcrypt.hash(password, 10),
    };
    users.push(user);

    const verification = await issueVerification(user, users);

    res.status(201).json({
      verificationRequired: true,
      email,
      delivered: verification.delivered,
      code: devCode(verification.code, verification.delivered),
      pairingSecret: verification.pairingSecret,
      expiresInMinutes: config.auth.verifyTtlMinutes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Browser endpoint opened from the emailed link. Verifies the token and renders
 * a small confirmation page; the app then picks up the state via /auth/verify.
 */
authRouter.get('/verify', (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const users = loadUsers();
  const user = token
    ? users.find((candidate) => candidate.verifyTokenHash === hashCode(token))
    : undefined;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!user) {
    res
      .status(400)
      .send(renderPage('Link not valid', 'This verification link is invalid or has already been used.', false));
    return;
  }
  if (!user.verifyExpiresAt || Date.now() > user.verifyExpiresAt) {
    user.verifyTokenHash = undefined;
    user.verifyCodeHash = undefined;
    user.verifyExpiresAt = undefined;
    saveUsers(users);
    res
      .status(400)
      .send(renderPage('Link expired', 'This link has expired. Request a new one from the app.', false));
    return;
  }

  markVerified(user);
  saveUsers(users);
  res.send(
    renderPage('Email verified', 'Your account is active. Return to the Jay AI app to continue.', true)
  );
});

/**
 * App endpoint. Either confirms a short code, or (with no code) reports whether
 * the emailed link has been clicked. The app supplies its pairing secret so this
 * cannot be used to claim someone else's account.
 */
authRouter.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = normaliseEmail(req.body?.email);
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const pairingSecret = typeof req.body?.pairingSecret === 'string' ? req.body.pairingSecret : '';

    const users = loadUsers();
    const user = users.find((candidate) => candidate.email === email);
    if (!user) {
      throw new ApiError('We could not find that account.', { code: 'not_found', status: 404 });
    }

    const pairingOk =
      Boolean(pairingSecret) &&
      Boolean(user.pairingSecretHash) &&
      user.pairingSecretHash === hashCode(pairingSecret);
    if (!pairingOk) {
      throw new ApiError('This verification session is no longer valid. Request a new email.', {
        code: 'invalid_pairing',
        status: 401,
      });
    }

    if (user.verified) {
      const publicUser = toPublic(user);
      user.pairingSecretHash = undefined;
      saveUsers(users);
      res.json({ verified: true, token: issueToken(publicUser), user: publicUser });
      return;
    }

    if (!code) {
      res.json({ verified: false });
      return;
    }

    if (!/^\d{4,8}$/.test(code)) {
      throw new ApiError('Enter the code we emailed you.', { code: 'invalid_code', status: 400 });
    }
    if (!user.verifyCodeHash || !user.verifyExpiresAt) {
      throw new ApiError('Request a new verification email.', { code: 'no_code', status: 400 });
    }
    if (Date.now() > user.verifyExpiresAt) {
      user.verifyCodeHash = undefined;
      user.verifyTokenHash = undefined;
      user.verifyExpiresAt = undefined;
      user.verifyAttempts = 0;
      saveUsers(users);
      throw new ApiError('That code has expired. Request a new one.', {
        code: 'code_expired',
        status: 400,
      });
    }
    if (user.verifyAttempts && user.verifyAttempts >= 5) {
      throw new ApiError('Too many attempts. Request a new code.', {
        code: 'too_many_attempts',
        status: 429,
      });
    }
    if (hashCode(code) !== user.verifyCodeHash) {
      user.verifyAttempts = (user.verifyAttempts ?? 0) + 1;
      saveUsers(users);
      throw new ApiError('That code is not correct.', { code: 'invalid_code', status: 400 });
    }

    markVerified(user);
    const publicUser = toPublic(user);
    user.pairingSecretHash = undefined;
    saveUsers(users);
    res.json({ verified: true, token: issueToken(publicUser), user: publicUser });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/resend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = normaliseEmail(req.body?.email);
    const users = loadUsers();
    const user = users.find((candidate) => candidate.email === email);

    // Always answer 200 so this endpoint cannot be used to probe for accounts.
    if (!user || user.verified) {
      res.json({ verificationRequired: false, email, delivered: false });
      return;
    }

    const verification = await issueVerification(user, users);
    res.json({
      verificationRequired: true,
      email,
      delivered: verification.delivered,
      code: devCode(verification.code, verification.delivered),
      pairingSecret: verification.pairingSecret,
      expiresInMinutes: verification.expiresInMinutes,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = normaliseEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = loadUsers().find((candidate) => candidate.email === email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError('Incorrect email or password.', {
        code: 'invalid_credentials',
        status: 401,
      });
    }

    if (!user.verified) {
      throw new ApiError('Please verify your email to continue.', {
        code: 'email_not_verified',
        status: 403,
      });
    }

    const publicUser = toPublic(user);
    res.json({ token: issueToken(publicUser), user: publicUser });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ user: req.user });
});
