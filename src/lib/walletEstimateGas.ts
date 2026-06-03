/** Response from `POST /v2/wallet/estimate-gas` (after API envelope unwrap). */
export type EstimateGasApiResponse = {
  success?: boolean;
  txType?: string;
  chainId?: number;
  blockchain?: string;
  network?: string;
  gasPrice?: string;
  gasPriceWei?: string;
  estimatedGasLimit?: string;
  gasLimitWithBuffer?: string;
  estimatedCostWei?: string;
  estimatedCostEth?: string;
  maxFeePerGas?: string | null;
  maxPriorityFeePerGas?: string | null;
};

export function formatBackendGasSummary(est: EstimateGasApiResponse | null): string {
  if (!est) return "";
  const parts: string[] = [];
  if (est.estimatedCostEth) parts.push(`~${est.estimatedCostEth} ETH`);
  if (est.gasPrice) parts.push(est.gasPrice);
  if (est.txType) parts.push(est.txType.replace(/_/g, " "));
  return parts.join(" · ");
}
