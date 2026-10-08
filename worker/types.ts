export interface Env {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  ASSETS: Fetcher;
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
  const message = typeof value.message === 'string' ? value.message : 'Database request failed';
  return error(code === '42501' ? 'not authorized' : message, code === '42501' ? 403 : 400, code);
}

export async function requestJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
