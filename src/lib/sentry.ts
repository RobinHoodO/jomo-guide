import * as Sentry from '@sentry/react';

export type QueuedErrors = unknown[] & { dispose?: () => void };

let initialized = false;
const pendingErrors: unknown[] = [];

export function captureError(error: unknown) {
  if (!initialized) {
    pendingErrors.push(error);
    return;
  }
  Sentry.captureException(error);
}

export function initSentry(queuedErrors: QueuedErrors = [] as QueuedErrors) {
  if (initialized) return;

  // DSN is public by design (client-side). Only report from the deployed build.
  Sentry.init({
    dsn: 'https://8fc1f3e8fc5ad60f61ed6d5216174c46@o4511115127750656.ingest.de.sentry.io/4511695122464848',
    release: __APP_VERSION__,
    tracesSampleRate: 0,
    // These come from in-app browser native bridges, not our app.
    ignoreErrors: [
      'Java object is gone',
      'Method not found',
      '__firefox__',
      'window.webkit',
      'Error invoking postMessage',
      'Error invoking post',
      'Error invoking postEvent',
      'Error invoking enableDidUserTypeOnKeyboardLogging',
      // WebExtension API — a browser extension injected into the page, not us.
      'Invalid call to runtime.sendMessage',
    ],
    denyUrls: [
      /^iabjs:\/\//i,
      /^(?!https?:\/\/)[a-z][a-z\d+.-]*:/i,
      // Vercel's own Web Analytics beacon, injected by <Analytics /> in App.tsx.
      // When Web Analytics isn't enabled on the Vercel project, this 404s as HTML,
      // which the browser tries to parse as JS ("Unexpected token '<'") — Vercel's bug, not ours.
      /\/_vercel\/insights\/script\.js/,
    ],
  });
  initialized = true;
  [...queuedErrors, ...pendingErrors].forEach(captureError);
  queuedErrors.dispose?.();
  pendingErrors.length = 0;
}
