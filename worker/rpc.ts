import { runAs } from './db';
import type { Env } from './types';

type ArgType = 'uuid' | 'text' | 'uuid[]' | 'boolean' | 'int' | 'timestamptz' | 'interval';
type Spec = { args: Record<string, ArgType>; returnsVoid?: boolean };

const rpc: Record<string, Spec> = {
  claim_mission: { args: { p_mission_id: 'uuid' } },
  submit_claim: { args: { p_claim_id: 'uuid', p_text: 'text' } },
  mission_reward: { args: { p_mission_id: 'uuid' } },
  quest_shape: { args: { p_quest_id: 'uuid' } },
  quest_shapes: { args: { p_quest_ids: 'uuid[]' } },
  hq_overview: { args: {} },
  // Database gm_attempts is deliberately the brute-force protection for this call.
  gm_elevate: { args: { p_pass: 'text' } },
  gm_approve_claim: { args: { p_claim_id: 'uuid' }, returnsVoid: true },
  gm_release_claim: { args: { p_claim_id: 'uuid' }, returnsVoid: true },
  gm_delete_mission: { args: { p_mission_id: 'uuid' }, returnsVoid: true },
  gm_set_mission_closed: { args: { p_mission_id: 'uuid', p_closed: 'boolean' }, returnsVoid: true },
  gm_force_advance: { args: { p_quest_id: 'uuid', p_step: 'int' }, returnsVoid: true },
  // TODO(neon): confirm gm_post_notice's p_expires signature; the UI supplies an ISO timestamp.
  gm_post_notice: { args: { p_body: 'text', p_expires: 'timestamptz' }, returnsVoid: true },
  gm_retire_notice: { args: { p_id: 'uuid' }, returnsVoid: true },
  release_expired_claims: { args: { p_max_age: 'interval' }, returnsVoid: true }
};

const casts: Record<ArgType, string> = { uuid: 'uuid', text: 'text', 'uuid[]': 'uuid[]', boolean: 'boolean', int: 'integer', timestamptz: 'timestamptz', interval: 'interval' };

export async function handleRpc(env: Env, uid: string, name: string, body: unknown) {
  const spec = Object.hasOwn(rpc, name) ? rpc[name] : undefined;
  if (!spec) throw new Error('Unknown RPC');
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid RPC arguments');
  const args = body as Record<string, unknown>;
  const names = Object.keys(spec.args);
  if (Object.keys(args).some((key) => !names.includes(key)) || names.some((key) => !(key in args))) throw new Error('Invalid RPC arguments');
  const params = names.map((name) => args[name]);
  const call = names.map((name, index) => `$${index + 1}::${casts[spec.args[name]]}`).join(', ');
  const rows = await runAs(env, uid, { text: `select public.${name}(${call}) as data`, params });
  return { data: spec.returnsVoid ? null : (rows[0]?.data ?? null) };
}
