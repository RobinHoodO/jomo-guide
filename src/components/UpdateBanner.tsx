import { usePwaUpdate } from '../hooks/usePwaUpdate';

export function UpdateBanner() {
  const { needRefresh, applyUpdate } = usePwaUpdate();

  if (!needRefresh) return null;

  return (
    <div className="update-banner" role="status">
      <span>✨ New version available<br />New guide available (~3 MB download)</span>
      <button type="button" onClick={applyUpdate} aria-label="Update JOMO Guide to the newest version">
        Update ▸
      </button>
    </div>
  );
}
