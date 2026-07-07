import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/800.css';
import App from './App';
import './styles.css';

// DSN is public by design (client-side). Only report from the deployed build.
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: 'https://8fc1f3e8fc5ad60f61ed6d5216174c46@o4511115127750656.ingest.de.sentry.io/4511695122464848',
    tracesSampleRate: 0.1,
  });
}

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    const update = async () => {
      if (!navigator.onLine) return;

      try {
        await registration.update();
      } catch {
        // Offline or flaky playa connections must never surface update errors.
      }
    };

    const intervalId = window.setInterval(update, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void update();
      }
    });

    // SW updates never clear storage; favorites persist in localStorage at 'jomo26:favorites'.
    void intervalId;
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p style={{ padding: 24 }}>Something broke — reload to try again.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
