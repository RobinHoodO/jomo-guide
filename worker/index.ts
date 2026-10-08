import { createAnonymousSession, bearer, verifySession, requireSession } from './session';
import { handleQuery } from './query';
import { handleRpc } from './rpc';
import { error, json, postgresError, requestJson, type Env } from './types';

export async function fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (url.pathname === '/api/health' && request.method === 'GET') return json({ ok: true });
  if (url.pathname === '/api/auth/session' && request.method === 'POST') {
    try {
      const session = await verifySession(env, bearer(request));
      if (session) return json({ token: bearer(request), user_id: session.sub, expires_at: new Date(session.exp * 1000).toISOString() });
      return json(await createAnonymousSession(env));
    } catch (cause) {
      return postgresError(cause);
    }
  }
  const session = await requireSession(request, env);
  if (!session) return error('Unauthorized', 401);
  if (url.pathname === '/api/q' && request.method === 'POST') {
    try {
      const result = await handleQuery(env, session.sub, await requestJson(request));
      return 'error' in result && result.error ? error(result.error.message, result.status, result.error.code) : json(result);
    } catch (cause) {
      return cause instanceof Error && /^(Invalid|Unknown)/.test(cause.message) ? error(cause.message) : postgresError(cause);
    }
  }
  const rpc = url.pathname.match(/^\/api\/rpc\/([^/]+)$/);
  if (rpc && request.method === 'POST') {
    try {
      return json(await handleRpc(env, session.sub, decodeURIComponent(rpc[1]), await requestJson(request)));
    } catch (cause) {
      return cause instanceof Error && /^(Invalid|Unknown)/.test(cause.message) ? error(cause.message) : postgresError(cause);
    }
  }
  return error('Not found', 404);
}

export default { fetch } satisfies ExportedHandler<Env>;
