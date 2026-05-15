/** WebSocket URL for arena matchmaking. */
export function arenaSocketUrl(): string {
  const env = import.meta.env.VITE_ARENA_WS_URL as string | undefined;
  if (env?.trim()) return env.trim();

  // Direct to arena server in dev (reliable on Windows; avoids Vite WS proxy quirks).
  if (import.meta.env.DEV) {
    return "ws://127.0.0.1:5181";
  }

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/arena-ws`;
}
