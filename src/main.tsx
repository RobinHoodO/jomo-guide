import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
// Latin subsets only — the full imports also pull Devanagari (119 KB) and
// Vietnamese (9 KB), which this audience will never render. latin-ext stays:
// event and camp names include Polish, Czech and Turkish characters.
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-ext-600.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/baloo-2/latin-ext-800.css';
import App from './App';
import { initPwa } from './lib/pwa';
import { ErrorBoundary } from './lib/sentry-boundary';
import type { QueuedErrors } from './lib/sentry';
import './styles.css';

const HQ = lazy(() => import('./components/HQ'));

const queuedErrors = [] as QueuedErrors;
const onError = (event: ErrorEvent) => queuedErrors.push(event.error ?? new Error(event.message));
const onUnhandledRejection = (event: PromiseRejectionEvent) => queuedErrors.push(event.reason);
window.addEventListener('error', onError);
window.addEventListener('unhandledrejection', onUnhandledRejection);
queuedErrors.dispose = () => {
  window.removeEventListener('error', onError);
  window.removeEventListener('unhandledrejection', onUnhandledRejection);
};

initPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {location.pathname === '/hq' ? <Suspense fallback={<p style={{ padding: 24 }}>Connecting…</p>}><HQ /></Suspense> : <App />}
    </ErrorBoundary>
  </StrictMode>
);

if (import.meta.env.PROD) void import('./lib/sentry').then((m) => m.initSentry(queuedErrors));
