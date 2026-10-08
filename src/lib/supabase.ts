type ApiError = { message: string; code?: string };
type ApiResult<T = any> = { data: T; error: ApiError | null };

const SESSION_KEY = 'jomo-session-v1';
let client: ApiClient | null | undefined;
let signInInFlight: Promise<string | null> | undefined;

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function apiBase() {
  const configured = import.meta.env.VITE_API_BASE?.trim();
  return configured ? configured.replace(/\/$/, '') : '/api';
}

function readToken() {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string) {
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch {
    // Storage can be unavailable in private browsing; the session still works for this request.
  }
}

function tokenPayload(token: string | null): { sub?: string; exp?: number } | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as { sub?: string; exp?: number };
  } catch {
    return null;
  }
}

function localUserId() {
  const payload = tokenPayload(readToken());
  return payload?.sub && typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() ? payload.sub : null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const token = readToken();
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers
      }
    });
    const payload = (await response.json().catch(() => null)) as { data?: T; error?: ApiError; message?: string; code?: string } | null;
    if (!response.ok) {
      return {
        data: null as T,
        error: payload?.error ?? { message: payload?.message ?? `Request failed (${response.status})`, code: payload?.code }
      };
    }
    return { data: (payload?.data ?? null) as T, error: null };
  } catch {
    return { data: null as T, error: { message: 'Failed to fetch' } };
  }
}

type Filter = { col: string; val: unknown };
type QueryBody = {
  table: string;
  op: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  select?: string;
  values?: Record<string, unknown>;
  filters: Filter[];
  order?: { col: string; ascending?: boolean };
  limit?: number;
  onConflict?: string;
  single?: 'single' | 'maybeSingle';
};

class QueryBuilder<T = any> implements PromiseLike<ApiResult<T>> {
  private readonly body: QueryBody;

  constructor(table: string, op: QueryBody['op'] = 'select', values?: Record<string, unknown>) {
    this.body = { table, op, values, filters: [] };
  }

  select(columns = '*') {
    this.body.select = columns;
    return this;
  }

  insert(values: Record<string, unknown>) {
    return new QueryBuilder<T>(this.body.table, 'insert', values);
  }

  update(values: Record<string, unknown>) {
    return new QueryBuilder<T>(this.body.table, 'update', values);
  }

  upsert(values: Record<string, unknown>, options: { onConflict?: string } = {}) {
    const next = new QueryBuilder<T>(this.body.table, 'upsert', values);
    next.body.onConflict = options.onConflict;
    return next;
  }

  delete() {
    return new QueryBuilder<T>(this.body.table, 'delete');
  }

  eq(col: string, val: unknown) {
    this.body.filters.push({ col, val });
    return this;
  }

  order(col: string, options: { ascending?: boolean } = {}) {
    this.body.order = { col, ascending: options.ascending };
    return this;
  }

  limit(limit: number) {
    this.body.limit = limit;
    return this;
  }

  single() {
    this.body.single = 'single';
    return this;
  }

  maybeSingle() {
    this.body.single = 'maybeSingle';
    return this;
  }

  then<TResult1 = ApiResult<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return request<T>('/q', { method: 'POST', body: JSON.stringify(this.body) }).then(onfulfilled, onrejected);
  }
}

class ApiClient {
  from(table: string) {
    return new QueryBuilder(table);
  }

  rpc<T = any>(name: string, args: Record<string, unknown> = {}) {
    return request<T>(`/rpc/${encodeURIComponent(name)}`, { method: 'POST', body: JSON.stringify(args) });
  }

  auth = {
    getSession: async (): Promise<{ data: { session: { user: { id: string } } | null }; error: null }> => {
      const id = localUserId();
      return { data: { session: id ? { user: { id } } : null }, error: null };
    }
  };
}

/** A small, lazy supabase-js-shaped client for the same-origin Worker API. */
export function getSupabase(): ApiClient | null {
  if (client !== undefined) return client;
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    client = null;
    return client;
  }
  client = new ApiClient();
  return client;
}

/** Returns the valid local subject, or creates one anonymous Worker session online. */
export function ensureSignedIn(): Promise<string | null> {
  if (signInInFlight) return signInInFlight;
  signInInFlight = (async () => {
    const existing = localUserId();
    if (existing) return existing;
    if (!getSupabase() || isOffline()) return null;
    const response = await request<{ token?: string; user_id?: string }>('/auth/session', { method: 'POST' });
    if (response.error || !response.data?.token || !response.data.user_id) return null;
    writeToken(response.data.token);
    return response.data.user_id;
  })().finally(() => {
    signInInFlight = undefined;
  });
  return signInInFlight;
}
