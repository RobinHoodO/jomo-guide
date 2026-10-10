import { runAs } from './db';
import type { Env } from './types';

export type SessionPayload = { sub: string; iat: number; exp: number };
const encoder = new TextEncoder();

function base64url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  let different = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) different |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return different === 0;
}

export async function signSession(env: Env, payload: SessionPayload) {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  return `${body}.${base64url(await hmac(env.SESSION_SECRET, body))}`;
}

export async function verifySession(env: Env, token: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra) return null;
  try {
    const expected = await hmac(env.SESSION_SECRET, body);
    if (!equalBytes(expected, decodeBase64url(signature))) return null;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64url(body))) as SessionPayload;
    if (typeof payload.sub !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(payload.sub)) return null;
    if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearer(request: Request) {
  const value = request.headers.get('authorization');
  return value?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

export async function requireSession(request: Request, env: Env) {
  return verifySession(env, bearer(request));
}

export async function createAnonymousSession(env: Env) {
  const now = Math.floor(Date.now() / 1000);
  const sub = crypto.randomUUID();
  await runAs(env, sub, { text: 'select public.register_anon_user($1::uuid)', params: [sub] });
  const payload = { sub, iat: now, exp: now + 60 * 60 * 24 * 365 * 2 };
  return { token: await signSession(env, payload), user_id: sub, expires_at: new Date(payload.exp * 1000).toISOString() };
}
