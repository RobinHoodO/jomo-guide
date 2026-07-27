import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;
let signInInFlight: Promise<string | null> | undefined;

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Creates the Supabase client only when a missions action actually needs it.
 * Importing this module intentionally has no storage or network side effects.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey || typeof window === 'undefined' || typeof localStorage === 'undefined') {
    client = null;
    return client;
  }

  try {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: localStorage
      }
    });
  } catch {
    // Invalid configuration or unavailable browser storage must not break the app shell.
    client = null;
  }

  return client;
}

/**
 * Returns an existing user id or creates an anonymous session when online.
 * Concurrent callers share one attempt so a single interaction never creates
 * multiple anonymous accounts.
 */
export function ensureSignedIn(): Promise<string | null> {
  if (signInInFlight) return signInInFlight;

  signInInFlight = (async () => {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session?.user.id) return data.session.user.id;

      if (isOffline()) return null;

      const signIn = await supabase.auth.signInAnonymously();
      if (signIn.error) return null;

      return signIn.data.user?.id ?? null;
    } catch {
      // Signing in is optional infrastructure: callers can queue or degrade gracefully.
      return null;
    }
  })().finally(() => {
    signInInFlight = undefined;
  });

  return signInInFlight;
}
