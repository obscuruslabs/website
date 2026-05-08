// Stateless admin session cookies. HMAC-SHA256 over `{ email, exp }`,
// 30-day default TTL. Web Crypto only so middleware (edge runtime) can
// verify on every request.
//
// Distinct secret from the magic-link token: rotating session keys
// (forcing logout) is independent of rotating link-issuance keys.

import type { NextResponse } from 'next/server';

const enc = new TextEncoder();
const dec = new TextDecoder();

function toBuf(s: string): Uint8Array<ArrayBuffer> {
  const bytes = enc.encode(s);
  const buf = new ArrayBuffer(bytes.byteLength);
  const out = new Uint8Array(buf);
  out.set(bytes);
  return out;
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const SESSION_COOKIE_NAME = 'admin_session';

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(input: string): Uint8Array<ArrayBuffer> {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    toBuf(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) {
    throw new Error('ADMIN_SESSION_SECRET is not set');
  }
  return s;
}

export async function signSession(
  email: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = JSON.stringify({ email, exp });
  const payloadB64 = b64urlEncode(enc.encode(payload));
  const key = await importKey(getSecret());
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, toBuf(payloadB64)),
  );
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

export type VerifySessionResult =
  | { ok: true; email: string }
  | { ok: false; reason: 'invalid' | 'expired' };

export async function verifySession(
  token: string,
): Promise<VerifySessionResult> {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'invalid' };
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return { ok: false, reason: 'invalid' };

  let sig: Uint8Array<ArrayBuffer>;
  try {
    sig = b64urlDecode(sigB64);
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  const key = await importKey(getSecret());
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sig,
    toBuf(payloadB64),
  );
  if (!valid) return { ok: false, reason: 'invalid' };

  let payload: { email?: unknown; exp?: unknown };
  try {
    payload = JSON.parse(dec.decode(b64urlDecode(payloadB64)));
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  if (typeof payload.email !== 'string' || typeof payload.exp !== 'number') {
    return { ok: false, reason: 'invalid' };
  }
  if (Math.floor(Date.now() / 1000) >= payload.exp) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, email: payload.email };
}

// HttpOnly so the client JS can't read it. Path scoped to /admin so it
// never rides on requests to the public site or the Stripe webhook.
// Secure on prod (NODE_ENV === 'production') so the browser refuses to
// send it over plain http; relaxed on dev because localhost.
export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: DEFAULT_TTL_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: 0,
  });
}
