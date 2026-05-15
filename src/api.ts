/** ks-wallet-be wraps JSON as `{ status, message, result }` */

const normalizeBase = (u: string | undefined) => (u?.trim().replace(/\/$/, "") ?? "");

/** Direct URL when you intentionally bypass the Vite dev proxy. */
const LOCAL_DEV_WALLET_API = "http://localhost:3005";

const base = () =>
  normalizeBase(import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "";

function buildUrl(root: string, path: string): string {
  const p = path.replace(/^\//, "");
  const r = normalizeBase(root);
  if (!r) return `/${p}`;
  return `${r}/${p}`;
}

function networkErrorDetail(url: string, err: unknown): string {
  const baseMsg = err instanceof Error ? err.message : String(err);
  if (baseMsg !== "Failed to fetch" && baseMsg !== "Load failed" && baseMsg !== "NetworkError when attempting to fetch resource.") {
    return baseMsg;
  }
  return (
    `${baseMsg}: no response from server. Request URL: ${url}. ` +
    `Common causes: ks-wallet-be not running, wrong port, mixed content (HTTPS page calling HTTP API), or CORS. ` +
    `For local dev, run the API on port 3005 and use \`npm run dev\` (Vite proxies /v2, /auth, /relayer, /chains-and-network) or set VITE_CREATE_WALLET_BASE_URL=${LOCAL_DEV_WALLET_API}.`
  );
}

/** Best-effort parse of API JSON body (ks-wallet-be uses `{ message, httpStatus, … }`). */
function extractJsonObject(text: string): Record<string, unknown> {
  const t = text.trim();
  if (!t) return {};
  try {
    const p = JSON.parse(t) as unknown;
    if (p !== null && typeof p === "object" && !Array.isArray(p)) {
      return p as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function messageFromApiBody(raw: Record<string, unknown>): string | undefined {
  const m = raw.message;
  if (typeof m === "string" && m.trim()) return m.trim();
  if (Array.isArray(m)) {
    const parts = m.filter((x): x is string => typeof x === "string");
    if (parts.length) return parts.join("; ");
  }
  return undefined;
}

function httpErrorDetail(
  res: Response,
  text: string,
  raw: Record<string, unknown>,
  requestUrl: string,
): string {
  const fromBody = messageFromApiBody(raw);
  if (fromBody) return fromBody;
  const t = text.trim();
  if (t && t !== "{}") {
    return t.length > 400 ? `${t.slice(0, 400)}…` : t;
  }
  const ct = res.headers.get("content-type")?.split(";")[0]?.trim();
  const devEmptyPlain500 =
    import.meta.env.DEV &&
    res.status >= 500 &&
    (!t || t === "{}") &&
    (ct === "text/plain" || !ct);
  return (
    `(no JSON error message; body empty or not JSON)${ct ? ` content-type: ${ct}` : ""}. ` +
    (devEmptyPlain500
      ? `Typical in Vite dev: ks-wallet-be is not running on the proxy target (default 127.0.0.1:3005), or the proxy reset the connection — URL was ${requestUrl}. Restart the API or set VITE_PROXY_WALLET_API. `
      : "") +
    `Check DevTools → Network → Response and API server logs.`
  );
}

async function readJsonWrappedResponse<T>(
  res: Response,
  okLabel: string,
  requestUrl: string,
): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  const rawErr = extractJsonObject(text);

  if (!res.ok) {
    throw new Error(`${res.status}: ${httpErrorDetail(res, text, rawErr, requestUrl)}`);
  }

  if (!trimmed) {
    throw new Error(`${res.status}: empty response body (${okLabel})`);
  }

  let raw: Record<string, unknown>;
  try {
    const p = JSON.parse(trimmed) as unknown;
    if (p === null || typeof p !== "object" || Array.isArray(p)) {
      throw new SyntaxError("expected JSON object");
    }
    raw = p as Record<string, unknown>;
  } catch {
    throw new Error(
      `${res.status}: expected JSON object from ${okLabel}; first bytes: ${trimmed.slice(0, 200)}${trimmed.length > 200 ? "…" : ""}`,
    );
  }

  return (raw.result ?? raw) as T;
}

/**
 * Host for auth, wallet v2, and `POST /relayer/send-transaction` (same surface as alpha-wallet-api).
 * Priority: `VITE_CREATE_WALLET_BASE_URL` → `VITE_API_BASE_URL` → in dev **empty** (same-origin + Vite proxy) → alpha.
 */
export function createWalletApiBase(): string {
  return (
    normalizeBase(import.meta.env.VITE_CREATE_WALLET_BASE_URL as string | undefined) ||
    base() ||
    (import.meta.env.DEV ? "" : "https://alpha-wallet-api.kalp.studio")
  );
}

/**
 * Host for `POST /relayer/write-transaction`.
 * Priority: `VITE_RELAYER_WRITE_BASE_URL` → `VITE_API_BASE_URL` → in dev same-origin proxy → wallet-api.
 */
export function relayerWriteApiBase(): string {
  return (
    normalizeBase(import.meta.env.VITE_RELAYER_WRITE_BASE_URL as string | undefined) ||
    base() ||
    (import.meta.env.DEV ? "" : "https://wallet-api.kalp.studio")
  );
}

export type ApiConfig = { apiKey?: string };

export type ApiPostOptions = {
  /** If set, request goes to `{baseUrl}/path` instead of `VITE_API_BASE_URL`. */
  baseUrl?: string;
};

export type ApiGetOptions = {
  baseUrl?: string;
  /** Optional; some routes accept `apikey` only. */
  apiKey?: string;
  /** Optional; `GET /chains-and-network` (alpha) expects `Authorization: Bearer …`. */
  bearerToken?: string;
};

export async function apiGetJson<T>(path: string, opts?: ApiGetOptions): Promise<T> {
  const root = normalizeBase(opts?.baseUrl ?? base()) || "";
  const url = buildUrl(root, path);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  if (opts?.apiKey?.trim()) headers.apikey = opts.apiKey.trim();
  if (opts?.bearerToken?.trim()) {
    headers.Authorization = `Bearer ${opts.bearerToken.trim()}`;
  }
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers });
  } catch (e) {
    throw new Error(networkErrorDetail(url, e));
  }
  return readJsonWrappedResponse<T>(res, `GET ${url}`, url);
}

export async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
  cfg: ApiConfig,
  opts?: ApiPostOptions,
): Promise<T> {
  const root = normalizeBase(opts?.baseUrl ?? base()) || "";
  const url = buildUrl(root, path);
  const apiKeyHeader = (cfg.apiKey ?? "").trim();
  if (!apiKeyHeader) {
    throw new Error(
      "Missing API key: paste your open API key at the top of the page or sign in again so requests can send the apikey header.",
    );
  }

  let res: Response;
  try {
    res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
        apikey: apiKeyHeader,
        "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(body),
  });
  } catch (e) {
    throw new Error(networkErrorDetail(url, e));
  }
  return readJsonWrappedResponse<T>(res, `POST ${path}`, url);
}
