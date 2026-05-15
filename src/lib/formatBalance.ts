function unwrap(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const d = data as Record<string, unknown>;
  const inner = d.result ?? d.data ?? d;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return d;
}

/** Native coin line, e.g. `0.05 ETH`. */
export function formatNativeLine(data: unknown, symbol = "ETH"): string {
  const o = unwrap(data);
  if (typeof o.native === "string" || typeof o.native === "number") {
    return `${o.native} ${symbol}`.trim();
  }
  for (const key of ["balance", "amount", "value", "formattedBalance"] as const) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return `${v.trim()} ${symbol}`;
    if (typeof v === "number" && Number.isFinite(v)) return `${v} ${symbol}`;
  }
  return "—";
}

/** ERC-20 line from token balance response, e.g. `2.0 KC`. */
export function formatErc20Line(data: unknown): string {
  const o = unwrap(data);
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
