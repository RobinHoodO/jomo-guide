import { neon } from '@neondatabase/serverless';
import type { Env } from './types';

export type Statement = { text: string; params: unknown[] };

/** Every application query gets a transaction-local auth.uid() identity. */
export async function runAs(env: Env, uid: string, statement: Statement) {
  const sql = neon(env.DATABASE_URL);
  const results = await sql.transaction((tx) => [
    tx`select set_config('request.jwt.claim.sub', ${uid}, true)`,
    tx.query(statement.text, statement.params)
  ]);
  return results[1];
}
