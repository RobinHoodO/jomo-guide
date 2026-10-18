export interface Env {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  ASSETS: Fetcher;
  /** Per-IP limiter for anonymous session creation (wrangler `ratelimits`). Optional so tests and local dev run without it. */
  SESSION_LIMITER?: RateLimit;
}

export type ApiError = { message: string; code?: string };

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
}

export function error(message: string, status = 400, code?: string) {
  return json({ error: { message, ...(code ? { code } : {}) } }, status);
}

export function postgresError(cause: unknown) {
  const value = cause && typeof cause === 'object' ? cause as { message?: unknown; code?: unknown } : {};
  const code = typeof value.code === 'string' ? value.code : undefined;
  if (code === '42501') return error('not authorized', 403, code);
  // Only errors our own SQL raises (P0001 raise, 23xxx constraints) are safe to show; anything else may leak internals.
  if (code && /^(P0001|23\d{3})$/.test(code) && typeof value.message === 'string') return error(value.message, 400, code);
  // 22xxx = bad input value (e.g. malformed uuid): the caller's fault. Its message echoes the rejected input, so log the code only.
  if (code && /^22\d{3}$/.test(code)) {
    console.error('database request failed', { code });
    return error('Invalid request', 400, code);
  }
  console.error('database request failed', { code, message: typeof value.message === 'string' ? value.message : undefined });
  return error('Database request failed', 500);
}

export async function requestJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
