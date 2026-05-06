// Stateless waitlist confirmation tokens. HMAC-SHA256 over a JSON payload
// containing the email and an absolute expiry. No database — the token is
// the record. We use Web Crypto so this is edge-runtime compatible.
//
// Token shape: `<base64url(payload)>.<base64url(signature)>`
//   payload = JSON.stringify({ email, exp })  // exp = unix seconds
//
// `verifyToken` is constant-time (subtle.crypto.verify is) and refuses
// expired tokens.

const enc = new TextEncoder();
const dec = new TextDecoder();

// `TextEncoder.encode` returns `Uint8Array<ArrayBufferLike>` under recent
// TypeScript lib defs. `crypto.subtle.{sign,verify,importKey}` want a
// `BufferSource` backed specifically by `ArrayBuffer`, not `SharedArrayBuffer`.
// Copy into a freshly-allocated ArrayBuffer to satisfy the variance.
function toBuf(s: string): Uint8Array<ArrayBuffer> {
  const bytes = enc.encode(s);
  const buf = new ArrayBuffer(bytes.byteLength);
  const out = new Uint8Array(buf);
  out.set(bytes);
  return out;
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

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
  const s = process.env.WAITLIST_TOKEN_SECRET;
  if (!s) {
    throw new Error('WAITLIST_TOKEN_SECRET is not set');
  }
  return s;
}

export async function signToken(
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

export type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: 'invalid' | 'expired' };

export async function verifyToken(token: string): Promise<VerifyResult> {
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
