function envelope(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  return data as Record<string, unknown>;
}

/** Unwrap object payloads (`result` / `data`); scalar `result` stays on the envelope. */
function unwrapObject(data: unknown): Record<string, unknown> {
  const d = envelope(data);
  const inner = d.result ?? d.data ?? d;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return d;
}

function formatAmount(value: string | number, symbol: string): string {
  const s = typeof value === "number" ? String(value) : value.trim();
  if (!s) return "—";
  return symbol ? `${s} ${symbol}`.trim() : s;
}

/** Native coin line, e.g. `0.05 ETH`. */
export function formatNativeLine(data: unknown, symbol = "ETH"): string {
  // apiPost unwraps envelope → native balance is often already a scalar string
  if (typeof data === "string" || typeof data === "number") {
    return formatAmount(data, symbol);
  }

  const d = envelope(data);
  const result = d.result ?? d.data;

  // Native-only API: { status, message, result: "0.049999978999622" }
  if (typeof result === "string" || typeof result === "number") {
    return formatAmount(result, symbol);
  }

  const o = unwrapObject(data);
  if (typeof o.native === "string" || typeof o.native === "number") {
    return formatAmount(o.native, symbol);
  }
  for (const key of ["balance", "amount", "value", "formattedBalance", "result"] as const) {
    const v = o[key];
    if (typeof v === "string" && v.trim() && !v.startsWith("{")) {
      return formatAmount(v, symbol);
    }
    if (typeof v === "number" && Number.isFinite(v)) return formatAmount(v, symbol);
  }
  return "—";
}

/** ERC-20 line from token balance response, e.g. `2.0 KC`. */
export function formatErc20Line(data: unknown): string {
  const o = unwrapObject(data);
  const t = o.token;
  if (t && typeof t === "object" && !Array.isArray(t)) {
    const tok = t as Record<string, unknown>;
    const bal = tok.balance;
    const sym = typeof tok.symbol === "string" ? tok.symbol : "";
    if (bal !== undefined && bal !== null && sym) return `${bal} ${sym}`;
    if (bal !== undefined && bal !== null) return String(bal);
  }
  return "—";
}

export function formatBalanceHint(data: unknown): string {
  const native = formatNativeLine(data);
  if (native !== "—") return native;
  const erc20 = formatErc20Line(data);
  return erc20 !== "—" ? erc20 : "";
}

/** Short UI message for balance API / RPC failures. */
export function shortBalanceError(message: string): string {
  const m = message.trim();
  if (/too many requests/i.test(m) || /-32005/.test(m)) {
    return "RPC rate limit — wait a few seconds and tap Refresh.";
  }
  if (/failed to fetch token balance/i.test(m)) {
    return "Token balance unavailable — try Refresh again.";
  }
  if (m.length > 120) return `${m.slice(0, 120)}…`;
  return m;
}
