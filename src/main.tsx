import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
// Latin subsets only — the full imports also pull Devanagari (119 KB) and
// Vietnamese (9 KB), which this audience will never render. latin-ext stays:
// event and camp names include Polish, Czech and Turkish characters.
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-ext-600.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/baloo-2/latin-ext-800.css';
import App from './App';
import { initPwa } from './lib/pwa';
import './styles.css';

// DSN is public by design (client-side). Only report from the deployed build.
if (import.meta.env.PROD) {
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
    ],
    denyUrls: [
      /^iabjs:\/\//i,
      /^(?!https?:\/\/)[a-z][a-z\d+.-]*:/i,
    ],
  });
}

initPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p style={{ padding: 24 }}>Something broke — reload to try again.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
