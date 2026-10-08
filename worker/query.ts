import { runAs, type Statement } from './db';
import type { Env } from './types';

type Operation = 'select' | 'insert' | 'update' | 'upsert' | 'delete';
type Query = {
  table: string;
  op: Operation;
  select?: string;
  values?: Record<string, unknown>;
  filters: Array<{ col: string; val: unknown }>;
  order?: { col: string; ascending?: boolean };
  limit?: number;
  onConflict?: string;
  single?: 'single' | 'maybeSingle';
};

const columns: Record<string, readonly string[]> = {
  profiles: ['id', 'display_name', 'created_at'],
  missions: ['id', 'creator_id', 'title', 'description', 'capacity_type', 'capacity', 'grid_ref', 'requires_presence', 'verification_mode', 'submission_prompt', 'visibility', 'is_closed', 'expires_at', 'reward_kind', 'reward_threshold', 'quest_id', 'quest_step', 'quest_reveal', 'created_at', 'updated_at'],
  mission_claims: ['id', 'mission_id', 'claimer_id', 'state', 'claimed_at', 'done_at', 'released_at', 'submission_note', 'submitted_at'],
  mission_rewards: ['mission_id', 'body', 'closer_body'],
  mission_answers: ['mission_id', 'answer_norm'],
  notices: ['id', 'body', 'active', 'created_at', 'expires_at']
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const quote = (identifier: string) => `"${identifier}"`;
const knownColumn = (table: string, column: string) => columns[table]?.includes(column) ?? false;

function bad(message: string): never {
  throw new Error(message);
}

function queryFrom(value: unknown): Query {
  if (!isRecord(value) || typeof value.table !== 'string' || typeof value.op !== 'string' || !Array.isArray(value.filters)) bad('Invalid query');
  const table = value.table as string;
  const op = value.op as string;
  if (!Object.hasOwn(columns, table) || !['select', 'insert', 'update', 'upsert', 'delete'].includes(op)) bad('Unknown table or operation');
  const filters = value.filters.map((filter) => {
    if (!isRecord(filter) || typeof filter.col !== 'string' || !knownColumn(table, filter.col) || !('val' in filter)) bad('Unknown filter column');
    return { col: filter.col, val: filter.val };
  });
  if (value.values !== undefined && !isRecord(value.values)) bad('Invalid values');
  if (isRecord(value.values) && Object.keys(value.values).some((column) => !knownColumn(table, column))) bad('Unknown value column');
  if (value.order !== undefined && (!isRecord(value.order) || typeof value.order.col !== 'string' || !knownColumn(table, value.order.col))) bad('Unknown order column');
  if (value.limit !== undefined && (!Number.isInteger(value.limit) || (value.limit as number) < 1 || (value.limit as number) > 500)) bad('Invalid limit');
  if (value.onConflict !== undefined && (typeof value.onConflict !== 'string' || value.onConflict.split(',').some((column) => !knownColumn(table, column.trim())))) bad('Unknown conflict column');
  if (value.single !== undefined && value.single !== 'single' && value.single !== 'maybeSingle') bad('Invalid single mode');
  return { table, op: op as Operation, select: typeof value.select === 'string' ? value.select : undefined, values: value.values as Record<string, unknown> | undefined, filters, order: value.order as Query['order'], limit: value.limit as number | undefined, onConflict: value.onConflict as string | undefined, single: value.single as Query['single'] };
}

function checkSelect(query: Query) {
  const select = query.select;
  if (!select || select === '*') return;
  const allowedEmbeds = query.table === 'missions'
    ? ['creator:profiles!missions_creator_id_fkey(display_name)', 'mission_claims(id,mission_id,claimer_id,state,claimed_at,done_at,released_at,submission_note,submitted_at,claimer:profiles!mission_claims_claimer_id_fkey(display_name))']
    : query.table === 'mission_claims'
      ? ['claimer:profiles!mission_claims_claimer_id_fkey(display_name)', 'mission:missions!mission_claims_mission_id_fkey(title, submission_prompt)']
      : [];
  let remaining = select;
  for (const embed of allowedEmbeds) remaining = remaining.replace(embed, '');
  const topLevel = remaining.split(',').map((part) => part.trim()).filter(Boolean);
  if (topLevel.some((column) => !knownColumn(query.table, column))) bad('Unknown selected column');
  const hasEmbedSyntax = /[():!]/.test(select);
  if (hasEmbedSyntax && !allowedEmbeds.some((embed) => select.includes(embed))) bad('Unknown relationship');
}

function selectedColumns(table: string, select: string | undefined) {
  if (!select || select === '*') return [...columns[table]];
  let remaining = select;
  const embeds = [
    'creator:profiles!missions_creator_id_fkey(display_name)',
    'mission_claims(id,mission_id,claimer_id,state,claimed_at,done_at,released_at,submission_note,submitted_at,claimer:profiles!mission_claims_claimer_id_fkey(display_name))',
    'claimer:profiles!mission_claims_claimer_id_fkey(display_name)',
    'mission:missions!mission_claims_mission_id_fkey(title, submission_prompt)'
  ];
  for (const embed of embeds) remaining = remaining.replace(embed, '');
  return remaining.split(',').map((part) => part.trim()).filter(Boolean);
}

function jsonObject(table: string, alias: string, select: string | undefined) {
  const fields = selectedColumns(table, select);
  return fields.length
    ? `jsonb_build_object(${fields.flatMap((field) => [`'${field}'`, `${alias}.${quote(field)}`]).join(', ')})`
    : `'{}'::jsonb`;
}

function rowJson(table: string, alias: string, select: string | undefined) {
  let result = jsonObject(table, alias, select);
  if (table === 'missions' && select?.includes('creator:profiles!missions_creator_id_fkey')) {
    result += ` || jsonb_build_object('creator', (select jsonb_build_object('display_name', p.display_name) from public.profiles p where p.id = ${alias}.creator_id))`;
  }
  if (table === 'missions' && select?.includes('mission_claims(')) {
    const claim = `${jsonObject('mission_claims', 'mc', 'id,mission_id,claimer_id,state,claimed_at,done_at,released_at,submission_note,submitted_at')} || jsonb_build_object('claimer', (select jsonb_build_object('display_name', cp.display_name) from public.profiles cp where cp.id = mc.claimer_id))`;
    result += ` || jsonb_build_object('mission_claims', coalesce((select jsonb_agg(${claim}) from public.mission_claims mc where mc.mission_id = ${alias}.id), '[]'::jsonb))`;
  }
  if (table === 'mission_claims' && select?.includes('claimer:profiles!mission_claims_claimer_id_fkey')) {
    const claimer = `jsonb_build_object('claimer', (select jsonb_build_object('display_name', p.display_name) from public.profiles p where p.id = ${alias}.claimer_id))`;
    const mission = select.includes('mission:missions!mission_claims_mission_id_fkey')
      ? ` || jsonb_build_object('mission', (select jsonb_build_object('title', m.title, 'submission_prompt', m.submission_prompt) from public.missions m where m.id = ${alias}.mission_id))`
      : '';
    result += ` || ${claimer}${mission}`;
  }
  return result;
}

function where(query: Query, params: unknown[]) {
  if (!query.filters.length) return '';
  return ` where ${query.filters.map((filter) => { params.push(filter.val); return `t.${quote(filter.col)} is not distinct from $${params.length}`; }).join(' and ')}`;
}

function returning(table: string, select: string | undefined, mutation: string) {
  return select ? `with changed as (${mutation} returning *) select coalesce(jsonb_agg(${rowJson(table, 't', select)}), '[]'::jsonb) as data from changed t` : mutation;
}

function statementFor(query: Query): Statement {
  checkSelect(query);
  const params: unknown[] = [];
  const table = `public.${quote(query.table)}`;
  const clause = where(query, params);
  if (query.op === 'select') {
    const order = query.order ? ` order by t.${quote(query.order.col)} ${query.order.ascending === false ? 'desc' : 'asc'}` : '';
    const limit = query.limit ? ` limit ${query.limit}` : '';
    return { text: `select coalesce(jsonb_agg(${rowJson(query.table, 't', query.select)}), '[]'::jsonb) as data from ${table} t${clause}${order}${limit}`, params };
  }
  if (query.op !== 'delete' && (!query.values || Object.keys(query.values).length === 0)) bad('Invalid values');
  if ((query.op === 'insert' || query.op === 'upsert') && query.filters.length) bad('Filters are not supported for inserts');
  if (query.op === 'delete') return { text: returning(query.table, query.select, `delete from ${table} t${clause}`), params };
  const keys = Object.keys(query.values ?? {});
  const values = keys.map((key) => query.values?.[key]);
  if (query.op === 'insert' || query.op === 'upsert') {
    const placeholders = values.map((value) => { params.push(value); return `$${params.length}`; });
    let mutation = `insert into ${table} (${keys.map(quote).join(', ')}) values (${placeholders.join(', ')})`;
    if (query.op === 'upsert') {
      if (!query.onConflict) bad('onConflict is required for upsert');
      const conflict = query.onConflict.split(',').map((column) => quote(column.trim())).join(', ');
      const updateKeys = keys.filter((key) => !query.onConflict?.split(',').map((column) => column.trim()).includes(key));
      mutation += updateKeys.length ? ` on conflict (${conflict}) do update set ${updateKeys.map((key) => `${quote(key)} = excluded.${quote(key)}`).join(', ')}` : ` on conflict (${conflict}) do nothing`;
    }
    return { text: returning(query.table, query.select, mutation), params };
  }
  const assignments = keys.map((key, index) => { params.push(values[index]); return `${quote(key)} = $${params.length}`; }).join(', ');
  return { text: returning(query.table, query.select, `update ${table} t set ${assignments}${clause}`), params };
}

export async function handleQuery(env: Env, uid: string, body: unknown) {
  const query = queryFrom(body);
  const rows = await runAs(env, uid, statementFor(query));
  const data = query.select ? (rows[0]?.data ?? []) : null;
  if (query.single === 'single' && (!Array.isArray(data) || data.length !== 1)) return { error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }, status: 406 };
  if (query.single === 'maybeSingle' && Array.isArray(data) && data.length > 1) return { error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }, status: 406 };
  if (query.single === 'maybeSingle') return { data: Array.isArray(data) ? (data[0] ?? null) : null };
  return { data: query.single === 'single' ? data[0] : data };
}
