import { env } from 'cloudflare:workers';
import { isOperator } from './access.mjs';

// Self-contained operator sign-in: an approved email plus one shared password,
// exchanged for a signed, HttpOnly session cookie. No third-party identity
// provider is required, so the site works on any Cloudflare account or locally.

export type User = { userId: string; email: string; displayName: string };

const COOKIE = 'tow_session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const enc = new TextEncoder();

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const hex = (bytes: Uint8Array) => Array.from(bytes).map((n) => n.toString(16).padStart(2, '0')).join('');

export const authConfigured = () =>
  typeof env.SESSION_SECRET === 'string' && env.SESSION_SECRET.length >= 16 &&
  typeof env.OPERATOR_PASSWORD === 'string' && env.OPERATOR_PASSWORD.length >= 8;

async function hmac(value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value)));
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)));
}

// Compare digests so length and timing do not leak the password.
export async function passwordMatches(candidate: string): Promise<boolean> {
  if (!authConfigured()) return false;
  const a = await digest(candidate);
  const b = await digest(env.OPERATOR_PASSWORD as string);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function userIdFor(email: string): Promise<string> {
  return hex(await digest('operator:' + email.trim().toLowerCase())).slice(0, 32);
}

function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export async function getUser(req: Request): Promise<User | null> {
  if (!authConfigured()) return null;
  const raw = readCookie(req, COOKIE);
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;
  try {
    const expected = await hmac(payload);
    const given = fromB64url(sig);
    if (given.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ given[i];
    if (diff !== 0) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (typeof data.email !== 'string' || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    // Re-check the allowlist so removing an operator takes effect immediately.
    if (!isOperator(data.email, env.OPERATOR_EMAILS)) return null;
    return { userId: await userIdFor(data.email), email: data.email, displayName: data.email };
  } catch {
    return null;
  }
}

const cookieAttrs = (req: Request, maxAge: number) =>
  `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;

export async function sessionCookie(req: Request, email: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ email: email.trim().toLowerCase(), exp: Date.now() + SESSION_SECONDS * 1000 })));
  return `${COOKIE}=${payload}.${b64url(await hmac(payload))}; ${cookieAttrs(req, SESSION_SECONDS)}`;
}

export const clearedCookie = (req: Request) => `${COOKIE}=; ${cookieAttrs(req, 0)}`;
