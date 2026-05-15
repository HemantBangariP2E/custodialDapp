export type Session = {
  apiKey: string;
  userId: string;
  walletAddress: string;
  email?: string;
  blockchain?: string;
  network?: string;
  chainIdStr?: string;
};

const STORAGE = "custodial-demo-session-v1";
const API_KEY_STORAGE = "custodial-demo-apikey-v1";

export function loadSession(): Session | null {
  try {
    const s = sessionStorage.getItem(STORAGE);
    if (!s) return null;
    const o = JSON.parse(s);
    if (o?.apiKey && o?.userId && o?.walletAddress) return o as Session;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveSession(s: Session | null) {
  if (!s) sessionStorage.removeItem(STORAGE);
  else sessionStorage.setItem(STORAGE, JSON.stringify(s));
}

export function loadStoredApiKey(): string {
  try {
    return sessionStorage.getItem(API_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function saveStoredApiKey(key: string) {
  if (!key.trim()) sessionStorage.removeItem(API_KEY_STORAGE);
  else sessionStorage.setItem(API_KEY_STORAGE, key.trim());
}

export function isAuthenticated(session: Session | null): boolean {
  return !!(session?.walletAddress && session.apiKey && session.userId);
}
