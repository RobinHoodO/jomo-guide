/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_SECRET_CELL_HASH: string;
  readonly VITE_PRESENCE_CELL_HASH: string;
}
