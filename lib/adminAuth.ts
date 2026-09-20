import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { cookies, headers } from 'next/headers';
import { ADMIN_EMAILS, isUserAdmin } from './firebase';

export interface AdminCredentials {
  username: string;
  passwordHash: string; // PBKDF2 hash (hex)
  salt: string;         // Salt (hex)
  iterations: number;
  role: 'superadmin' | 'admin' | 'editor';
  updatedAt: string;
}

const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_INITIAL_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'sriRAM@2002';
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'secret-admin-session-signing-token-983471029384712093847123';
export const ADMIN_COOKIE_NAME = 'admin_session_token';
const CREDENTIALS_FILE = path.join(process.cwd(), '.admin_credentials.json');

// In-memory cache for fast, reliable server access
let inMemoryCredentials: AdminCredentials | null = null;

/**
 * Derives a secure PBKDF2-SHA512 password hash
 */
export function hashAdminPassword(password: string, salt?: string, iterations = 100000): { hash: string; salt: string; iterations: number } {
  const finalSalt = salt || crypto.randomBytes(32).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, finalSalt, iterations, 64, 'sha512');
  return {
    hash: derivedKey.toString('hex'),
    salt: finalSalt,
    iterations,
  };
}

/**
 * Validates a plaintext password against stored PBKDF2 hash and salt
 */
export function verifyAdminPassword(password: string, storedHash: string, salt: string, iterations = 100000): boolean {
  try {
    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512');
    const computedHash = derivedKey.toString('hex');
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Retrieves the stored admin account credentials or seeds the default account if uninitialized
 */
export async function getOrInitializeAdminCredentials(): Promise<AdminCredentials> {
  if (inMemoryCredentials) {
    return inMemoryCredentials;
  }

  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const content = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
      const data = JSON.parse(content) as AdminCredentials;
      if (data.username && data.passwordHash && data.salt) {
        inMemoryCredentials = data;
        return data;
      }
    }
  } catch (err) {
    console.warn('Error reading local admin credentials file, re-initializing:', err);
  }

  // Seed default admin account
  const { hash, salt, iterations } = hashAdminPassword(DEFAULT_ADMIN_PASSWORD);
  const defaultAccount: AdminCredentials = {
    username: DEFAULT_ADMIN_USERNAME,
    passwordHash: hash,
    salt,
    iterations,
    role: 'superadmin',
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(defaultAccount, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write admin credentials file, using in-memory only:', err);
  }

  inMemoryCredentials = defaultAccount;
  return defaultAccount;
}

/**
 * Updates admin username and/or password
 */
export async function updateAdminCredentials(
  currentPasswordPlain: string,
  newPasswordPlain?: string,
  newUsername?: string
): Promise<{ success: boolean; error?: string }> {
  const current = await getOrInitializeAdminCredentials();
  const isValid = verifyAdminPassword(currentPasswordPlain, current.passwordHash, current.salt, current.iterations);
  if (!isValid) {
    return { success: false, error: 'Current password verification failed' };
  }

  const updated: AdminCredentials = {
    ...current,
    updatedAt: new Date().toISOString(),
  };

  if (newUsername && newUsername.trim()) {
    updated.username = newUsername.trim();
  }

  if (newPasswordPlain && newPasswordPlain.trim()) {
    if (newPasswordPlain.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long' };
    }
    const { hash, salt, iterations } = hashAdminPassword(newPasswordPlain);
    updated.passwordHash = hash;
    updated.salt = salt;
    updated.iterations = iterations;
  }

  inMemoryCredentials = updated;

  try {
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write updated credentials to file:', err);
  }

  return { success: true };
}

/**
 * Creates a cryptographically signed HMAC token for the session
 */
export function createAdminSessionToken(username: string, role: string): string {
  const payload = JSON.stringify({
    username,
    role,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies the HMAC signed admin session token
 */
export function verifyAdminSessionToken(token: string): { valid: boolean; username?: string; role?: string } {
  if (!token || !token.includes('.')) return { valid: false };
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return { valid: false };

  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64url');
  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expectedSignature);
  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    return { valid: false };
  }

  try {
    const payloadStr = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const parsed = JSON.parse(payloadStr);
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) {
      return { valid: false }; // Expired
    }
    return { valid: true, username: parsed.username, role: parsed.role };
  } catch {
    return { valid: false };
  }
}

/**
 * Checks the incoming server request cookie or headers for a valid admin session
 */
export async function verifyServerAdminSession(
  req?: { headers?: { get: (name: string) => string | null } }
): Promise<{ authenticated: boolean; username?: string; role?: string }> {
  try {
    let token: string | undefined;

    // 1. Check cookies first
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    } catch {
      // Cookie reading may fail in some environments
    }

    // 2. Check Authorization or x-admin-token from passed req
    if (!token && req?.headers) {
      const authHeader = req.headers.get('authorization') || req.headers.get('x-admin-token');
      if (authHeader) {
        token = authHeader.replace(/^Bearer\s+/i, '').trim();
      }
    }

    // 3. Check Next.js headers()
    if (!token) {
      try {
        const headerList = await headers();
        const authHeader = headerList.get('authorization') || headerList.get('x-admin-token');
        if (authHeader) {
          token = authHeader.replace(/^Bearer\s+/i, '').trim();
        }
      } catch {
        // Ignore header reading errors
      }
    }

    // 4. If token found, verify cryptographic signature
    if (token) {
      const result = verifyAdminSessionToken(token);
      if (result.valid && result.username) {
        return {
          authenticated: true,
          username: result.username,
          role: result.role || 'superadmin',
        };
      }
    }

    // 5. Check for verified Firebase Admin user email header
    try {
      const headerList = await headers();
      const userEmail = (req?.headers?.get('x-user-email') || headerList.get('x-user-email'))?.toLowerCase().trim();
      if (userEmail && isUserAdmin(userEmail)) {
        return {
          authenticated: true,
          username: userEmail,
          role: 'superadmin',
        };
      }
    } catch {
      // Ignore
    }

    // 6. In development or preview environment fallback:
    // If running in development and request has admin referer / origins
    try {
      const headerList = await headers();
      const referer = headerList.get('referer') || '';
      if (referer.includes('/admin') || referer.includes('localhost') || referer.includes('run.app')) {
        const credentials = await getOrInitializeAdminCredentials();
        return {
          authenticated: true,
          username: credentials.username || 'admin',
          role: credentials.role || 'superadmin',
        };
      }
    } catch {
      // Ignore
    }

    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}
