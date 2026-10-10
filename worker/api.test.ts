// @vitest-environment node

import { neon } from '@neondatabase/serverless';
import { afterAll, describe, expect, it } from 'vitest';
import { fetch as workerFetch } from './index';
import type { Env } from './types';

const databaseUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.OWNER_URL;
const createdUsers: string[] = [];
const createdMissions: string[] = [];

const env: Env = {
  DATABASE_URL: databaseUrl ?? '',
  SESSION_SECRET: 'test',
  ASSETS: { fetch: () => Promise.resolve(new Response('asset')) } as unknown as Fetcher
};

async function api(path: string, init: RequestInit = {}) {
  return workerFetch(new Request(`https://example.test${path}`, init), env);
}

async function session() {
  const response = await api('/api/auth/session', { method: 'POST' });
  expect(response.status).toBe(200);
  const body = await response.json() as { token: string; user_id: string };
  createdUsers.push(body.user_id);
  return body;
}

function authorized(token: string, body: unknown) {
  return { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

const neonDescribe = describe.skipIf(!databaseUrl || !ownerUrl);

neonDescribe('Worker API seam', () => {
  it('creates an anonymous profile with a burner display name', async () => {
    const user = await session();
    const response = await api('/api/q', authorized(user.token, {
      table: 'profiles', op: 'select', select: 'id,display_name', filters: [{ col: 'id', val: user.user_id }], single: 'single'
    }));
    const body = await response.json() as { data: { display_name: string | null } };
    expect(body.data.display_name?.trim()).toBeTruthy();
  });

  it('returns ordered, limited selects as rows instead of a SQL error', async () => {
    const user = await session();
    const response = await api('/api/q', authorized(user.token, {
      table: 'missions', op: 'select', select: 'id,created_at', filters: [], order: { col: 'created_at', ascending: false }, limit: 2
    }));
    expect(response.status).toBe(200);
    const rows = (await response.json() as { data: Array<{ created_at: string }> }).data;
    expect(rows.length).toBeLessThanOrEqual(2);
    expect([...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))).toEqual(rows);
  });

  it('keeps a non-owner from changing or deleting a mission', async () => {
    const owner = await session();
    const other = await session();
    const create = await api('/api/q', authorized(owner.token, {
      table: 'missions', op: 'insert', select: 'id,title', filters: [], values: {
        creator_id: owner.user_id, title: `TEST-worker-${crypto.randomUUID()}`, description: '', capacity_type: 'open', capacity: null,
        grid_ref: null, requires_presence: false, verification_mode: 'none', submission_prompt: null, visibility: 'public', is_closed: false,
        expires_at: null, reward_kind: null, reward_threshold: null, quest_id: null, quest_step: null, quest_reveal: null
      }
    }));
    const mission = (await create.json() as { data: Array<{ id: string }> }).data[0];
    createdMissions.push(mission.id);

    await api('/api/q', authorized(other.token, { table: 'missions', op: 'update', filters: [{ col: 'id', val: mission.id }], values: { title: 'TEST-tampered' } }));
    await api('/api/q', authorized(other.token, { table: 'missions', op: 'delete', filters: [{ col: 'id', val: mission.id }] }));

    const observed = await api('/api/q', authorized(owner.token, {
      table: 'missions', op: 'select', select: 'id,title', filters: [{ col: 'id', val: mission.id }], single: 'single'
    }));
    const body = await observed.json() as { data: { title: string } };
    expect(body.data.title).not.toBe('TEST-tampered');

    const ownDelete = await api('/api/q', authorized(owner.token, { table: 'missions', op: 'delete', select: 'id', filters: [{ col: 'id', val: mission.id }] }));
    expect(ownDelete.status).toBe(200);
    expect((await ownDelete.json() as { data: unknown[] }).data).toHaveLength(1);
  });

  it('refuses GM-only functions for a normal user', async () => {
    const user = await session();
    const calls: Array<[string, Record<string, unknown>]> = [
      ['/api/rpc/hq_overview', {}],
      ['/api/rpc/gm_approve_claim', { p_claim_id: crypto.randomUUID() }]
    ];
    for (const [path, body] of calls) {
      const response = await api(path, authorized(user.token, body));
      const result = await response.json() as { error?: { message?: string } };
      expect(result.error?.message).toMatch(/not authorized/i);
    }
  });
});

afterAll(async () => {
  if (!ownerUrl) return;
  const sql = neon(ownerUrl);
  if (createdMissions.length) await sql.query('delete from public.missions where id = any($1::uuid[])', [createdMissions]);
  if (createdUsers.length) await sql.query('delete from auth.users where id = any($1::uuid[])', [createdUsers]);
});
