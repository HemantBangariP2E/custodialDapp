/**
 * @deprecated Prefer `gasFeeBreakdownFromWalletEstimate` + POST /v2/wallet/estimate-gas.
 * Legacy treasury-style: fixed gas units × RPC gasPrice → ETH → USD (browser RPC + CoinGecko).
 */

import type { EstimateGasApiResponse } from "./walletEstimateGas";

const ESTIMATED_GAS_UNITS = 65_000;
const ETH_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";

const RPC_BY_CHAIN: Record<string, string> = {
  "11155111":
    (import.meta.env.VITE_ETH_SEPOLIA_RPC as string) ||
    "https://ethereum-sepolia-rpc.publicnode.com",
  "1": "https://ethereum-rpc.publicnode.com",
  "84532": "https://sepolia.base.org",
  "8453": "https://mainnet.base.org",
};

export type GasFeeBreakdown = {
  gasUnits: number;
  gasPriceWei: bigint;
  gasCostEth: number;
  ethPriceUsd: number;
  gasUsd: number;
  platformFeeUsd: number;
  multiplier: number;
  totalFeeUsd: number;
  /** Token fee amount (demo: 1 USD ≈ 1 token unit). */
  feeAmountToken: number;
};

async function jsonRpc(rpcUrl: string, method: string, params: unknown[] = []): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result;
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

async function fetchGasPriceWei(chainId: string): Promise<bigint> {
  const rpc = RPC_BY_CHAIN[chainId] ?? RPC_BY_CHAIN["11155111"];
  try {
    const feeHistory = await jsonRpc(rpc, "eth_maxPriorityFeePerGas", []);
    const block = await jsonRpc(rpc, "eth_getBlockByNumber", ["latest", false]);
    const baseFee =
      block && typeof block === "object" && "baseFeePerGas" in block
        ? hexToBigInt(String((block as { baseFeePerGas: string }).baseFeePerGas))
        : 0n;
    const priority =
      typeof feeHistory === "string" ? hexToBigInt(feeHistory) : 1_500_000_000n;
    return baseFee > 0n ? baseFee + priority : await fetchLegacyGasPrice(rpc);
  } catch {
    return fetchLegacyGasPrice(rpc);
  }
}

async function fetchLegacyGasPrice(rpc: string): Promise<bigint> {
  const hex = await jsonRpc(rpc, "eth_gasPrice", []);
  if (typeof hex !== "string") throw new Error("Invalid gas price");
  return hexToBigInt(hex);
}

/** CoinGecko — ETH/USD for converting wallet API `estimatedCostEth` to USD. */
export async function fetchEthPriceUsd(): Promise<number> {
  const res = await fetch(ETH_PRICE_URL);
  if (!res.ok) throw new Error("ETH price unavailable");
  const json = (await res.json()) as { ethereum?: { usd?: number } };
  const p = json?.ethereum?.usd;
  if (p == null || !Number.isFinite(p)) throw new Error("ETH price missing");
  return p;
}

/** Map `POST /v2/wallet/estimate-gas` ERC-20 result into the same breakdown shape as legacy relay estimate. */
export function gasFeeBreakdownFromWalletEstimate(
  est: EstimateGasApiResponse,
  ethPriceUsd: number,
  opts?: { multiplier?: number; platformPercent?: number },
): GasFeeBreakdown {
  const multiplier = opts?.multiplier ?? 1;
  const platformPercent = opts?.platformPercent ?? 0.01;
  const gasCostEth = parseFloat(est.estimatedCostEth ?? "0");
  const safeCost = Number.isFinite(gasCostEth) ? gasCostEth : 0;
  const gasUnits = parseInt(est.gasLimitWithBuffer ?? est.estimatedGasLimit ?? "0", 10) || 65000;
  let gasPriceWei = 0n;
  try {
    gasPriceWei = BigInt(est.gasPriceWei ?? "0");
  } catch {
    gasPriceWei = 0n;
  }
  const gasUsd = safeCost * ethPriceUsd * multiplier;
  const platformFeeUsd = gasUsd * platformPercent;
  const totalFeeUsd = gasUsd + platformFeeUsd;
  const feeAmountToken = Math.max(0.000001, Math.round(totalFeeUsd * 1e6) / 1e6);
  return {
    gasUnits,
    gasPriceWei,
    gasCostEth: safeCost,
    ethPriceUsd,
    gasUsd,
    platformFeeUsd,
    multiplier,
    totalFeeUsd,
    feeAmountToken,
  };
}

export async function estimateRelayGasFeeUsd(
  chainId: string,
  opts?: { gasUnits?: number; multiplier?: number; platformPercent?: number },
): Promise<GasFeeBreakdown> {
  const gasUnits = opts?.gasUnits ?? ESTIMATED_GAS_UNITS;
  const multiplier = opts?.multiplier ?? 1;
  const platformPercent = opts?.platformPercent ?? 0.01;

  const [gasPriceWei, ethPriceUsd] = await Promise.all([
    fetchGasPriceWei(chainId),
    fetchEthPriceUsd(),
  ]);

  const gasCostWei = gasPriceWei * BigInt(gasUnits);
  const gasCostEth = Number(gasCostWei) / 1e18;
  const gasUsd = gasCostEth * ethPriceUsd * multiplier;
  const platformFeeUsd = gasUsd * platformPercent;
  const totalFeeUsd = gasUsd + platformFeeUsd;
  const feeAmountToken = Math.max(0.000001, Math.round(totalFeeUsd * 1e6) / 1e6);

  return {
    gasUnits,
    gasPriceWei,
    gasCostEth,
    ethPriceUsd,
    gasUsd,
    platformFeeUsd,
    multiplier,
    totalFeeUsd,
    feeAmountToken,
  };
}
