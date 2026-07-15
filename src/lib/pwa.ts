import { registerSW } from 'virtual:pwa-register';

type Snapshot = { needRefresh: boolean };
type UpdateSW = (reloadPage?: boolean) => Promise<void>;

const listeners = new Set<() => void>();

let snapshot: Snapshot = { needRefresh: false };
let registration: ServiceWorkerRegistration | undefined;
let updateSW: UpdateSW | undefined;
let initialized = false;
let cleanupRegistration: (() => void) | undefined;

function setNeedRefresh(needRefresh: boolean) {
  if (snapshot.needRefresh === needRefresh) return;

  snapshot = { needRefresh };
  listeners.forEach((listener) => listener());
}

async function updateRegistration() {
  if (!registration || !navigator.onLine) return;

  try {
    await registration.update();
  } catch {
    // Offline or flaky playa connections must never surface update errors.
  }
}

export function initPwa() {
  if (initialized) return;
  initialized = true;

  // Ask the browser not to evict our storage (SW cache + favorites) under disk pressure.
  // Best-effort: some browsers ignore it; failure changes nothing.
  void navigator.storage?.persist?.().catch(() => undefined);

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      setNeedRefresh(true);
    },
    onRegisteredSW(_swUrl, swRegistration) {
      if (!swRegistration) return;

      cleanupRegistration?.();
      registration = swRegistration;

      const intervalId = window.setInterval(updateRegistration, 60 * 60 * 1000);
      const onVisibilityChange = () => {
        if (document.visibilityState !== 'visible') return;

        if (snapshot.needRefresh) {
          applyUpdate();
          return;
        }

        void updateRegistration();
      };

      document.addEventListener('visibilitychange', onVisibilityChange);
      cleanupRegistration = () => {
        window.clearInterval(intervalId);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };

      // SW updates never clear storage; favorites persist in localStorage at 'jomo26:favorites'.
      void intervalId;
      void updateRegistration();
    },
    onRegisterError() {
      // Registration failures should degrade silently; the app still works without update checks.
    }
  });
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot() {
  return snapshot;
}

export function applyUpdate() {
  void updateSW?.(true);
}

export async function checkForUpdate() {
  if (!registration || !navigator.onLine) return false;

  try {
    await registration.update();
    const hasPendingUpdate = Boolean(registration.installing || registration.waiting);

    if (hasPendingUpdate) {
      setNeedRefresh(true);
    }

    return hasPendingUpdate;
  } catch {
    return false;
  }
}
