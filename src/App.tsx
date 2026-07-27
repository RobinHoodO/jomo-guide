import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Destinations } from './components/Destinations';
import { EstablishingLink } from './components/EstablishingLink';
import { InfoTab } from './components/InfoTab';
import { InstallBanner } from './components/InstallBanner';
import { MapTab } from './components/MapTab';
import { Missions } from './components/Missions';
import { MissingOutCounter } from './components/MissingOutCounter';
import { Program } from './components/Program';
import { PullToRefresh } from './components/PullToRefresh';
import { Schedule } from './components/Schedule';
import { UpdateBanner } from './components/UpdateBanner';
import { useFavorites } from './hooks/useFavorites';
import { EVENTS, parseGridCode } from './lib/events';
import { clearEventParam, readEventIdFromUrl } from './lib/deeplink';
import { initInstall } from './lib/install';
import {
  getSnapshot as getHiddenSnapshot,
  PRESENCE_PLACE_NAME,
  subscribe as subscribeHidden,
  subscribePresence
} from './lib/hidden';
import { canSpendBandwidth } from './lib/network';
import { flushUsage, recordOpen } from './lib/usage';

type Tab = 'program' | 'schedule' | 'map' | 'camps' | 'info' | 'missions';
type CampSelection = { id: string; token: number };
type MissionSelection = { id: string; token: number };
type SharedEvent = { id: string; title: string };

function TabIcon({ name }: { name: Tab }) {
  const paths = {
    program: <path d="M4 5h16M4 12h16M4 19h10" />,
    schedule: <path d="M12 3.25 14.75 8.82l6.15.9-4.45 4.34 1.05 6.12L12 17.29l-5.5 2.89 1.05-6.12L3.1 9.72l6.15-.9L12 3.25Z" />,
    map: <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15" />,
    camps: <path d="M12 4 3 20h18L12 4Zm0 0v16" />,
    info: <path d="M12 17v-6m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
    missions: <path d="m5 12 4.5 4.5L19 7" />
  };

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export default function App() {
  const { unlocked } = useSyncExternalStore(subscribeHidden, getHiddenSnapshot, getHiddenSnapshot);
  const [tab, setTab] = useState<Tab>('program');
  const [selectedGrid, setSelectedGrid] = useState<string | null>(null);
  const [selectedCamp, setSelectedCamp] = useState<CampSelection | null>(null);
  const [selectedMission, setSelectedMission] = useState<MissionSelection | null>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [plainBg, setPlainBg] = useState(false);
  const [sharedEvent, setSharedEvent] = useState<SharedEvent | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [presence, setPresence] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const deepLinkHighlightTimer = useRef<number | null>(null);
  const onlineFlushTimer = useRef<number | null>(null);
  const hasRecordedOpen = useRef(false);
  const { favoriteIds, isFavorite, toggleFavorite } = useFavorites();

  const handleUnlock = useCallback(() => {
    setTab('missions');
    setLinkOpen(true);
  }, []);

  const closeLink = useCallback(() => {
    setLinkOpen(false);
  }, []);

  useEffect(() => {
    initInstall();
    if (!hasRecordedOpen.current) {
      recordOpen();
      flushUsage();
      hasRecordedOpen.current = true;
    }

    const onOnline = () => {
      if (onlineFlushTimer.current !== null) return;

      onlineFlushTimer.current = window.setTimeout(() => {
        onlineFlushTimer.current = null;
        flushUsage();
      }, 60 * 1000);
    };
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('online', onOnline);
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current);
      }
      if (onlineFlushTimer.current !== null) {
        window.clearTimeout(onlineFlushTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!unlocked) {
      setPresence(false);
      return;
    }

    return subscribePresence(setPresence);
  }, [unlocked]);

  useEffect(() => {
    const eventId = readEventIdFromUrl();
    const event = EVENTS.find((item) => item.id === eventId);
    if (!eventId || !event) return;

    setTab('program');
    const frame = window.requestAnimationFrame(() => {
      clearEventParam();
      const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-event-id]'));
      const card = cards.find((item) => item.dataset.eventId === eventId && item.closest('.swipe-wrap'));
      if (!card) {
        setSharedEvent({ id: event.id, title: event.title });
        return;
      }
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ring-2', 'ring-pink', 'ring-offset-2', 'ring-offset-navy');
      deepLinkHighlightTimer.current = window.setTimeout(() => {
        card.classList.remove('ring-2', 'ring-pink', 'ring-offset-2', 'ring-offset-navy');
        deepLinkHighlightTimer.current = null;
      }, 2000);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (deepLinkHighlightTimer.current !== null) window.clearTimeout(deepLinkHighlightTimer.current);
    };
  }, []);

  const selectGrid = (grid: string) => {
    const parsed = parseGridCode(grid);
    if (!parsed) return;
    setSelectedGrid(parsed.code);
    setTab('map');
    window.requestAnimationFrame(() => {
      document.getElementById('map-tab')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const selectCamp = (campId: string) => {
    setSelectedCamp((current) => ({ id: campId, token: (current?.token ?? 0) + 1 }));
    setTab('camps');
  };

  const selectMission = (missionId: string) => {
    setSelectedMission((current) => ({ id: missionId, token: (current?.token ?? 0) + 1 }));
    setTab('missions');
  };

  const showScheduleToast = () => {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
    }
    setShowSavedToast(true);
    toastTimer.current = window.setTimeout(() => {
      setShowSavedToast(false);
      toastTimer.current = null;
    }, 1600);
  };

  const handleToggleFavorite = (id: string) => {
    if (!isFavorite(id)) {
      showScheduleToast();
    }
    toggleFavorite(id);
  };

  return (
    <>
      {canSpendBandwidth() ? <Analytics /> : null}
      <main
        className={`relative min-h-screen overflow-hidden bg-navy text-cream ${plainBg ? 'is-plain-bg' : ''}`}
        data-presence={presence ? 'true' : undefined}
      >
      <InstallBanner onOpenInfo={() => setTab('info')} />
      <UpdateBanner />
      <div className="ambient-blobs" aria-hidden="true">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
        <div className="ambient-blob ambient-blob-3" />
        <div className="ambient-blob ambient-blob-4" />
        <div className="ambient-blob ambient-blob-5" />
        <div className="ambient-blob ambient-blob-6" />
        <div className="ambient-blob ambient-blob-7" />
        <div className="ambient-blob ambient-blob-8" />
      </div>
      <PullToRefresh>
        <div className="relative z-10 mx-auto min-h-screen w-full max-w-xl px-4 py-4 sm:py-6">
          <header className="guide-header mb-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-kicker text-cream">Borderland 2026</p>
                <h1 className="display-heading mt-0.5 text-3xl font-black leading-8 text-cream">JOMO GUIDE</h1>
                <p className="mt-1 max-w-xl text-sm leading-5 text-cream">
                  Joy of missing out. Pick a few things. Let the rest sparkle elsewhere.
                </p>
                {presence ? <p className="section-kicker presence-place mt-2">{PRESENCE_PLACE_NAME}</p> : null}
              </div>
              <div className="flex items-start gap-1.5">
                <img
                  className="brand-mark"
                  src="/icons/icon-192.png"
                  alt="JOMO Guide"
                  width={44}
                  height={44}
                />
                <button
                  type="button"
                  className="brand-mark-toggle"
                  aria-pressed={plainBg}
                  aria-label={plainBg ? 'Show colorful background' : 'Use plain blue background'}
                  title={plainBg ? 'Colorful background' : 'Plain blue background'}
                  onClick={() => setPlainBg((current) => !current)}
                >
                  <span className="brand-mark-toggle-swatch" aria-hidden="true" />
                </button>
              </div>
            </div>
            <MissingOutCounter total={EVENTS.length} favorites={favoriteIds.length} />
            <p className="header-credits">
              Gifted to you by Schoepa, Larissa, Alex, Maja, Robin, Fay, Marcus & Anuta &lt;3
            </p>
            <nav className={`tabbar ${unlocked ? 'grid-cols-6' : 'grid-cols-5'}`} aria-label="Main tabs">
              <button
                type="button"
                className={tab === 'program' ? 'is-active' : ''}
                onClick={() => setTab('program')}
              >
                <TabIcon name="program" />
                <span>Program</span>
              </button>
              <button
                type="button"
                className={tab === 'schedule' ? 'is-active' : ''}
                onClick={() => setTab('schedule')}
              >
                {favoriteIds.length > 0 ? <span className="tab-badge">{favoriteIds.length}</span> : null}
                <TabIcon name="schedule" />
                <span>Favourites</span>
              </button>
              <button
                type="button"
                className={tab === 'map' ? 'is-active' : ''}
                onClick={() => setTab('map')}
              >
                <TabIcon name="map" />
                <span>Map</span>
              </button>
              <button
                type="button"
                className={tab === 'camps' ? 'is-active' : ''}
                onClick={() => setTab('camps')}
              >
                <TabIcon name="camps" />
                <span>Camps</span>
              </button>
              {unlocked ? (
                <button
                  type="button"
                  className={tab === 'missions' ? 'is-active' : ''}
                  onClick={() => setTab('missions')}
                >
                  <TabIcon name="missions" />
                  <span>Missions</span>
                </button>
              ) : null}
              <button
                type="button"
                className={tab === 'info' ? 'is-active' : ''}
                onClick={() => setTab('info')}
              >
                <TabIcon name="info" />
                <span>Info</span>
              </button>
            </nav>
          </header>

          {tab === 'program' ? (
            <Program
              isFavorite={isFavorite}
              toggleFavorite={handleToggleFavorite}
              onSelectGrid={selectGrid}
              onSelectCamp={selectCamp}
              sharedEvent={sharedEvent}
              onRevealSharedEvent={() => setSharedEvent(null)}
            />
          ) : null}

          {tab === 'schedule' ? (
            <Schedule
              favoriteIds={favoriteIds}
              isFavorite={isFavorite}
              toggleFavorite={handleToggleFavorite}
              onSelectGrid={selectGrid}
              onSelectCamp={selectCamp}
            />
          ) : null}

          {tab === 'map' ? (
            <MapTab
              selectedGrid={selectedGrid}
              onSelectGrid={selectGrid}
              onSelectCamp={selectCamp}
              isFavorite={isFavorite}
              toggleFavorite={handleToggleFavorite}
              onUnlock={handleUnlock}
              onOpenMissions={() => setTab('missions')}
              onOpenMission={selectMission}
            />
          ) : null}

          {tab === 'camps' ? (
            <Destinations
              selectedCamp={selectedCamp}
              isFavorite={isFavorite}
              toggleFavorite={handleToggleFavorite}
              onSelectGrid={selectGrid}
              onSelectCamp={selectCamp}
            />
          ) : null}

          {tab === 'info' ? <InfoTab /> : null}

          {tab === 'missions' ? (
            <Missions onSelectGrid={selectGrid} onSelectCamp={selectCamp} selectedMission={selectedMission} />
          ) : null}

          <footer className="guide-footer mt-8 border-t border-cream/20 py-4 text-xs leading-5 text-cream">
            Unofficial companion, made by a burner. Works offline after first load; your stars stay on this phone.{' '}
            <a
              href="https://github.com/RobinHoodO/jomo-guide"
              target="_blank"
              rel="noopener"
              className="footer-link"
            >
              Open source on GitHub
            </a>
          </footer>
        </div>
      </PullToRefresh>
      {showSavedToast ? (
        <div className="toast" role="status" aria-live="polite">
          Saved to your Schedule ⭐
        </div>
      ) : null}
      </main>
      <EstablishingLink open={linkOpen} onClose={closeLink} />
    </>
  );
}
