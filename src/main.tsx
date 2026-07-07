import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/800.css';
import App from './App';
import './styles.css';

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
    <App />
  </StrictMode>
);
