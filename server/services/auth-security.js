import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const AUTH_FAILURE_MESSAGE = 'Credenciales invalidas.';
export const AUTH_COOKIE_NAME = 'autotext_session';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commonPasswordPath = path.resolve(__dirname, '..', 'security', 'common-passwords.txt');

function loadCommonPasswords() {
  const builtIn = [
  'password',
  'password123',
  'admin',
  'admin123',
  'demo1234',
  'qwerty123',
  '12345678',
  '123456789',
  'contrasena',
  'autotext'
  ];

  try {
    const fileEntries = fs
      .readFileSync(commonPasswordPath, 'utf8')
      .split(/\r?\n/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return new Set([...builtIn, ...fileEntries]);
  } catch {
    return new Set(builtIn);
  }
}

const COMMON_PASSWORDS = loadCommonPasswords();

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function getClientIp(req) {
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req?.ip || req?.socket?.remoteAddress || 'anonymous';
}

export function validatePasswordPolicy(password, { email = '', minLength = 12 } = {}) {
  const value = String(password || '');
  const normalizedEmail = normalizeEmail(email);
  const lower = value.toLowerCase();
  const errors = [];

  if (value.length < minLength) {
    errors.push(`La contrasena debe tener al menos ${minLength} caracteres.`);
  }
  if (COMMON_PASSWORDS.has(lower)) {
    errors.push('La contrasena es demasiado comun.');
  }
  if (normalizedEmail && lower === normalizedEmail) {
    errors.push('La contrasena no puede ser igual al email.');
  }
  if (normalizedEmail && normalizedEmail.split('@')[0] && lower === normalizedEmail.split('@')[0]) {
    errors.push('La contrasena no puede ser igual al usuario del email.');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function isBcryptHash(hash) {
  return /^\$2[aby]\$\d{2}\$/.test(String(hash || ''));
}

export function getBcryptCost(hash) {
  const match = String(hash || '').match(/^\$2[aby]\$(\d{2})\$/);
  return match ? Number(match[1]) : null;
}

export function passwordNeedsRehash(hash, targetCost) {
  const cost = getBcryptCost(hash);
  return cost == null || cost < targetCost;
}

export async function hashPassword(password, cost = 12) {
  return bcrypt.hash(String(password || ''), cost);
}

export async function verifyPassword(password, hash) {
  if (!isBcryptHash(hash)) return false;
  return bcrypt.compare(String(password || ''), hash);
}

export function createJwtId() {
  return crypto.randomUUID();
}

export function createAccessToken({ jwtSecret, jwtExpiresIn, userId, email }) {
  const jti = createJwtId();
  const token = jwt.sign({ sub: String(userId), email }, jwtSecret, {
    expiresIn: jwtExpiresIn,
    jwtid: jti
  });
  const payload = jwt.decode(token) || {};
  const expiresAt = payload.exp
    ? new Date(payload.exp * 1000).toISOString()
    : new Date(Date.now() + 30 * 60 * 1000).toISOString();
  return { token, jti, expiresAt };
}

export function hashJwtId(jti) {
  return crypto.createHash('sha256').update(String(jti || '')).digest('hex');
}

export function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashJwtId(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };
}

export async function findActiveSession(appPool, jti) {
  if (!jti) return null;
  const result = await appPool.query(
    `SELECT user_id
     FROM app_user_sessions
     WHERE jti_hash = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [hashJwtId(jti)]
  );
  return result.rows[0] || null;
}

export function sanitizeAuthLog(extra = {}) {
  const blocked = new Set(['password', 'token', 'jwt', 'authorization', 'passwordHash', 'password_hash']);
  return Object.fromEntries(
    Object.entries(extra)
      .filter(([key]) => !blocked.has(key))
      .map(([key, value]) => [key, value == null ? value : String(value).slice(0, 200)])
  );
}
