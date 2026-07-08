import { useState } from 'react';
import { Destinations } from './components/Destinations';
import { InfoTab } from './components/InfoTab';
import { MapTab } from './components/MapTab';
import { MissingOutCounter } from './components/MissingOutCounter';
import { Program } from './components/Program';
import { PullToRefresh } from './components/PullToRefresh';
import { Schedule } from './components/Schedule';
import { UpdateBanner } from './components/UpdateBanner';
import { useFavorites } from './hooks/useFavorites';
import { EVENTS, parseGridCode } from './lib/events';

type Tab = 'program' | 'schedule' | 'map' | 'camps' | 'info';
type CampSelection = { id: string; token: number };

function TabIcon({ name }: { name: Tab }) {
  const paths = {
    program: <path d="M4 5h16M4 12h16M4 19h10" />,
    schedule: <path d="M8 3v4M16 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />,
    map: <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15" />,
    camps: <path d="M12 4 3 20h18L12 4Zm0 0v16" />,
    info: <path d="M12 17v-6m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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
  const [tab, setTab] = useState<Tab>('program');
  const [selectedGrid, setSelectedGrid] = useState<string | null>(null);
  const [selectedCamp, setSelectedCamp] = useState<CampSelection | null>(null);
  const { favoriteIds, isFavorite, toggleFavorite } = useFavorites();

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

  return (
    <main className="relative min-h-screen overflow-hidden bg-navy text-cream">
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
              </div>
              <img
                className="brand-mark"
                src="/icons/icon-192.png"
                alt="JOMO Guide"
                width={44}
                height={44}
              />
            </div>
            <MissingOutCounter total={EVENTS.length} favorites={favoriteIds.length} />
            <p className="header-credits">
              Gifted to you by Schoepa, Larissa, Alex, Maja, Robin, Fay, Marcus & Anuta &lt;3
            </p>
            <nav className="tabbar" aria-label="Main tabs">
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
                <TabIcon name="schedule" />
                <span>Schedule</span>
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
              toggleFavorite={toggleFavorite}
              onSelectGrid={selectGrid}
              onSelectCamp={selectCamp}
            />
          ) : null}

          {tab === 'schedule' ? (
            <Schedule
              favoriteIds={favoriteIds}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
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
              toggleFavorite={toggleFavorite}
            />
          ) : null}

          {tab === 'camps' ? (
            <Destinations
              selectedCamp={selectedCamp}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
              onSelectGrid={selectGrid}
              onSelectCamp={selectCamp}
            />
          ) : null}

          {tab === 'info' ? <InfoTab /> : null}

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
    </main>
  );
}
