/** WebSocket URL for arena matchmaking. */

export function isArenaWsConfigured(): boolean {
  const env = import.meta.env.VITE_ARENA_WS_URL as string | undefined;
  if (env?.trim()) return true;
  return import.meta.env.DEV;
}

/** URL used for WebSocket connect, or null if multiplayer is not configured (e.g. Netlify without env). */
export function arenaSocketUrl(): string | null {
  const env = import.meta.env.VITE_ARENA_WS_URL as string | undefined;
  if (env?.trim()) return env.trim();

  if (import.meta.env.DEV) {
    return "ws://127.0.0.1:5181";
  }

  return null;
}

/** Short label for status UI. */
export function arenaWsDisplayUrl(): string {
  return arenaSocketUrl() ?? "(not configured — set VITE_ARENA_WS_URL at build time)";
}

export const ARENA_PROD_SETUP_HINT =
  "Multiplayer needs a WebSocket server (not included on Netlify). Deploy server/arena-ws.mjs on Railway, Render, or Fly, then set VITE_ARENA_WS_URL=wss://your-host in Netlify → Site settings → Environment variables and redeploy.";

export const ARENA_DEV_SETUP_HINT =
  "Start the arena server: npm run dev (Vite + arena) or npm run arena-server in a second terminal (ws://127.0.0.1:5181).";
