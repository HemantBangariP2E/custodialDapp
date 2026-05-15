import { useCallback, useEffect, useRef, useState } from "react";
import { estimateRelayGasFeeUsd, type GasFeeBreakdown } from "../../lib/gasFeeEstimate";
import { PLATFORM_FEE_PERCENT, feeMultiplier } from "../../lib/stablieeConfig";

type Props = {
  chainId: string;
  tokenSymbol?: string;
  onFeeReady?: (fee: GasFeeBreakdown | null) => void;
};

export function GasFeeEstimatePanel({ chainId, tokenSymbol = "token", onFeeReady }: Props) {
  const [fee, setFee] = useState<GasFeeBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const onFeeReadyRef = useRef(onFeeReady);
  onFeeReadyRef.current = onFeeReady;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const breakdown = await estimateRelayGasFeeUsd(chainId, {
        multiplier: feeMultiplier(),
        platformPercent: PLATFORM_FEE_PERCENT,
      });
      setFee(breakdown);
      onFeeReadyRef.current?.(breakdown);
    } catch (e) {
      setFee(null);
      onFeeReadyRef.current?.(null);
      setError(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !fee) {
    return <p className="muted small">Estimating network gas…</p>;
  }
  if (error && !fee) {
    return (
      <p className="balance-error">
        Gas estimate unavailable. <button type="button" className="link-btn" onClick={load}>Retry</button>
      </p>
    );
  }
  if (!fee) return null;

  const mult = fee.multiplier !== 1 ? ` (×${fee.multiplier} relayer markup)` : "";

  return (
    <div className="gas-fee-panel">
      <p className="small muted">Treasury-style estimate (~{fee.gasUnits.toLocaleString()} gas units)</p>
      <ul className="fee-lines">
        <li>
          <span>Network gas</span>
          <strong>
            {fee.gasCostEth.toFixed(8)} ETH ≈ ${fee.gasUsd.toFixed(6)}
            {mult}
          </strong>
        </li>
        <li>
          <span>Platform ({(PLATFORM_FEE_PERCENT * 100).toFixed(0)}%)</span>
          <strong>${fee.platformFeeUsd.toFixed(6)}</strong>
        </li>
        <li className="fee-total">
          <span>Deducted from user ({tokenSymbol})</span>
          <strong>{fee.feeAmountToken.toFixed(6)} {tokenSymbol}</strong>
        </li>
      </ul>
      <p className="muted small">
        ETH @ ${fee.ethPriceUsd.toFixed(2)} · gas price {fee.gasPriceWei.toString()} wei
      </p>
    </div>
  );
}
