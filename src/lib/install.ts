type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string; platform: string }>;
};

type Snapshot = { canInstall: boolean };

export const IN_APP_BROWSER_TOKENS = [
  { token: 'FBAN', name: 'Facebook' },
  { token: 'FBAV', name: 'Facebook' },
  { token: 'FB_IAB', name: 'Facebook' },
  { token: 'Instagram', name: 'Instagram' },
  { token: 'LinkedIn', name: 'LinkedIn' },
  { token: 'Line/', name: 'LINE' },
  { token: 'Snapchat', name: 'Snapchat' },
  { token: 'Twitter', name: 'X' }
] as const;

const listeners = new Set<() => void>();

let snapshot: Snapshot = { canInstall: false };
let installPrompt: InstallPromptEvent | undefined;
let initialized = false;

function setCanInstall(canInstall: boolean) {
  if (snapshot.canInstall === canInstall) return;

  snapshot = { canInstall };
  listeners.forEach((listener) => listener());
}

export function isStandalone() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function isInAppBrowser() {
  return getInAppBrowserName() !== null;
}

export function getInAppBrowserName(): string | null {
  if (typeof navigator === 'undefined') return null;

  const userAgent = navigator.userAgent.toLowerCase();
  return IN_APP_BROWSER_TOKENS.find(({ token }) => userAgent.includes(token.toLowerCase()))?.name ?? null;
}

export function isIos() {
  if (typeof navigator === 'undefined') return false;

  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function initInstall() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
    setCanInstall(true);
  });
}

export function getInstallPrompt() {
  return installPrompt;
}

export async function promptInstall() {
  const currentPrompt = installPrompt;
  if (!currentPrompt) return undefined;

  try {
    await currentPrompt.prompt();
    return await currentPrompt.userChoice;
  } catch {
    return undefined;
  } finally {
    installPrompt = undefined;
    setCanInstall(false);
  }
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
