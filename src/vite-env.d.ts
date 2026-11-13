/// <reference types="vite/client" />

/** Versión de la página (la de package.json), puesta al compilar. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Dirección del intermediario de datos. */
  readonly VITE_API_BASE?: string;
}
