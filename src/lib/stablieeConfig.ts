/** Default dapp owner wallet for gas-fee collection (Stabliee Sepolia ETH). */
export const DEFAULT_FEE_RECIPIENT_SEPOLIA =
  "0xaAEd3fCdDEDA26F9AD0582698d9Be012e48D88aF";

export function resolveFeeRecipient(chainId: string): string {
  const fromEnv = import.meta.env.VITE_DAPP_FEE_RECIPIENT as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim();
  if (chainId === "11155111" || chainId === "1") return DEFAULT_FEE_RECIPIENT_SEPOLIA;
  return DEFAULT_FEE_RECIPIENT_SEPOLIA;
}

/** Platform markup on network gas (Stabliee uses 1%). */
export const PLATFORM_FEE_PERCENT = 0.01;

/** Optional markup aligned with relayer FEE_MULTIPLIER (default 1.0). */
export function feeMultiplier(): number {
  const raw = import.meta.env.VITE_FEE_MULTIPLIER as string | undefined;
  const n = raw ? parseFloat(raw) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}
