// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const runAs = vi.fn();
vi.mock('./db', () => ({ runAs: (...args: unknown[]) => runAs(...args) }));

import { fetch as workerFetch } from './index';
import { handleQuery } from './query';
import { signSession } from './session';
import type { Env } from './types';

function makeEnv(limiter?: RateLimit): Env {
  return {
    DATABASE_URL: 'postgres://unused',
    SESSION_SECRET: 'test',
    ASSETS: { fetch: () => Promise.resolve(new Response('asset')) } as unknown as Fetcher,
    SESSION_LIMITER: limiter
  };
}

function createSession(env: Env, headers: Record<string, string> = {}) {
  return workerFetch(new Request('https://example.test/api/auth/session', { method: 'POST', headers }), env);
}

beforeEach(() => {
  runAs.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('anonymous session rate limit', () => {
  it('returns 429 and creates no user when the per-IP limit is hit', async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    const response = await createSession(makeEnv({ limit }), { 'cf-connecting-ip': '203.0.113.7' });
    expect(response.status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: '203.0.113.7' });
    expect(runAs).not.toHaveBeenCalled();
  });

  it('creates a session when under the limit', async () => {
    runAs.mockResolvedValue([]);
    const limit = vi.fn().mockResolvedValue({ success: true });
    const response = await createSession(makeEnv({ limit }), { 'cf-connecting-ip': '203.0.113.7' });
    expect(response.status).toBe(200);
    expect(runAs).toHaveBeenCalledTimes(1);
  });

  it('does not rate limit re-issuing an existing valid session', async () => {
    const env = makeEnv({ limit: vi.fn().mockResolvedValue({ success: false }) });
    const now = Math.floor(Date.now() / 1000);
    const token = await signSession(env, { sub: crypto.randomUUID(), iat: now, exp: now + 3600 });
    const response = await createSession(env, { authorization: `Bearer ${token}`, 'cf-connecting-ip': '203.0.113.7' });
    expect(response.status).toBe(200);
    expect(runAs).not.toHaveBeenCalled();
  });
});

describe('postgres error handling', () => {
  async function failWith(cause: unknown) {
    runAs.mockRejectedValue(cause);
    const env = makeEnv();
    const now = Math.floor(Date.now() / 1000);
    const token = await signSession(env, { sub: crypto.randomUUID(), iat: now, exp: now + 3600 });
    const response = await workerFetch(new Request('https://example.test/api/q', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ table: 'missions', op: 'select', select: 'id', filters: [] })
    }), env);
    return { response, body: await response.json() as { error: { message: string; code?: string } } };
  }

  it('hides internals of unexpected database errors', async () => {
    const { response, body } = await failWith({ message: 'connection to 10.0.0.5:5432 refused for role app_owner', code: '08006' });
    expect(response.status).toBe(500);
    expect(body.error.message).toBe('Database request failed');
    expect(JSON.stringify(body)).not.toContain('10.0.0.5');
  });

  it('hides messages of errors without a code (driver or network failures)', async () => {
    const { body } = await failWith(new Error('fetch failed: ECONNRESET db.internal'));
    expect(body.error.message).toBe('Database request failed');
  });

  it.each(['P0001', '23505', '23503'])('keeps application error %s message', async (code) => {
    const { response, body } = await failWith({ message: 'mission is full', code });
    expect(response.status).toBe(400);
    expect(body.error).toEqual({ message: 'mission is full', code });
  });

  it('maps 42501 to 403 not authorized', async () => {
    const { response, body } = await failWith({ message: 'permission denied for table x', code: '42501' });
    expect(response.status).toBe(403);
    expect(body.error.message).toBe('not authorized');
  });
});

describe('single without select', () => {
  it('does not return PGRST116 for an update with single but no select', async () => {
    runAs.mockResolvedValue([]);
    const result = await handleQuery(makeEnv(), crypto.randomUUID(), {
      table: 'missions', op: 'update', filters: [{ col: 'id', val: crypto.randomUUID() }], values: { title: 'x' }, single: 'single'
    });
    expect(result).toEqual({ data: null });
  });

  it('does not return PGRST116 for a delete with single but no select', async () => {
    runAs.mockResolvedValue([]);
    const result = await handleQuery(makeEnv(), crypto.randomUUID(), {
      table: 'missions', op: 'delete', filters: [{ col: 'id', val: crypto.randomUUID() }], single: 'single'
    });
    expect(result).toEqual({ data: null });
  });

  it('still enforces exactly one row when select is present', async () => {
    runAs.mockResolvedValue([{ data: [] }]);
    const result = await handleQuery(makeEnv(), crypto.randomUUID(), {
      table: 'missions', op: 'update', select: 'id', filters: [{ col: 'id', val: crypto.randomUUID() }], values: { title: 'x' }, single: 'single'
    });
    expect(result).toMatchObject({ error: { code: 'PGRST116' }, status: 406 });
  });
});
