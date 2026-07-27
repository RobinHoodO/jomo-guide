import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  getSnapshot,
  getInAppBrowserName,
  isInAppBrowser,
  isIos,
  isStandalone,
  promptInstall,
  subscribe
} from '../lib/install';

type InstallBannerProps = {
  onOpenInfo: () => void;
};

const DISMISSED_KEY = 'jomo26:install-dismissed';
const serverSnapshot = { canInstall: false };

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function isIosSafari() {
  if (!isIos()) return false;

  return /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}

export function InstallBanner({ onOpenInfo }: InstallBannerProps) {
  const { canInstall } = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // The banner can still stay dismissed for this session.
    }
    setDismissed(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);

      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimer.current = null;
      }, 1600);
    } catch {
      // Clipboard access is not available in every in-app browser.
    }
  };

  if (isStandalone() || dismissed) return null;

  let message: React.ReactNode;
  let action: React.ReactNode;

  if (isInAppBrowser()) {
    message = `You're in ${getInAppBrowserName() ?? 'this app'}'s in-app browser — open in Safari/Chrome to install this and use it offline.`;
    action = (
      <button
        type="button"
        className="min-h-10 shrink-0 rounded-full bg-pink px-3 text-xs font-black text-cream transition-colors duration-200 hover:bg-yellow hover:text-indigo-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/60"
        onClick={() => void copyLink()}
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    );
  } else if (canInstall) {
    message = 'Install JOMO Guide for offline festival access.';
    action = (
      <button
        type="button"
        className="min-h-10 shrink-0 rounded-full bg-pink px-3 text-xs font-black text-cream transition-colors duration-200 hover:bg-yellow hover:text-indigo-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/60"
        onClick={() => void promptInstall()}
      >
        Install
      </button>
    );
  } else if (isIosSafari()) {
    message = (
      <>
        Install for offline use: Share → Add to Home Screen.{' '}
        <button
          type="button"
          className="inline-flex min-h-10 items-center underline decoration-pink underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/60"
          onClick={onOpenInfo}
        >
          Show me how
        </button>
      </>
    );
    action = null;
  } else {
    return null;
  }

  return (
    <div
      className="glass sticky top-0 z-[60] flex min-h-10 w-full items-center gap-2 border-x-0 border-t-0 px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-xs font-black text-cream shadow-[0_6px_16px_rgba(7,10,30,0.22)]"
      role="status"
    >
      <span className="min-w-0 flex-1 leading-4">{message}</span>
      {action}
      <button
        type="button"
        className="min-h-10 min-w-10 shrink-0 rounded-full text-xl leading-none text-cream/80 transition-colors duration-200 hover:bg-cream/10 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/60"
        aria-label="Dismiss install help"
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}
