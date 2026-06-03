import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWalletActions } from "../../hooks/useWalletActions";
import {
  fetchEthPriceUsd,
  gasFeeBreakdownFromWalletEstimate,
  type GasFeeBreakdown,
} from "../../lib/gasFeeEstimate";
import { PLATFORM_FEE_PERCENT, feeMultiplier } from "../../lib/stablieeConfig";

const ADDR = /^0x[a-fA-F0-9]{40}$/;

/** Live ERC-20 transfer to fee-estimate via POST /v2/wallet/estimate-gas. */
export type Erc20TransferTarget = {
  to: string;
  amount: number;
  tokenAddress: string;
};

type Props = {
  chainId: string;
  tokenSymbol?: string;
  onFeeReady?: (fee: GasFeeBreakdown | null) => void;
  /** Required for fee lines: wallet API gas for this transfer + CoinGecko ETH/USD. */
  erc20Transfer: Erc20TransferTarget | null;
};

export function GasFeeEstimatePanel({ chainId: _chainId, tokenSymbol = "token", onFeeReady, erc20Transfer }: Props) {
  const { session, estimateErc20TransferGas } = useWalletActions();
  const [fee, setFee] = useState<GasFeeBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const onFeeReadyRef = useRef(onFeeReady);
  onFeeReadyRef.current = onFeeReady;

  const targetKey = useMemo(() => {
    if (!erc20Transfer) return "";
    return `${erc20Transfer.tokenAddress}|${erc20Transfer.to}|${erc20Transfer.amount}`;
  }, [erc20Transfer]);

  const load = useCallback(async () => {
    setError("");
    if (
      !erc20Transfer ||
      !session?.walletAddress ||
      !ADDR.test(erc20Transfer.to.trim()) ||
      !ADDR.test(erc20Transfer.tokenAddress.trim()) ||
      !Number.isFinite(erc20Transfer.amount) ||
      erc20Transfer.amount <= 0
    ) {
      setFee(null);
      onFeeReadyRef.current?.(null);
      setError(
        !session?.walletAddress
          ? "hint:sign-in"
          : !erc20Transfer
            ? "hint:no-target"
            : "hint:invalid-form",
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [est, ethUsd] = await Promise.all([
        estimateErc20TransferGas({
          to: erc20Transfer.to.trim(),
          amount: erc20Transfer.amount,
          tokenAddress: erc20Transfer.tokenAddress.trim(),
        }),
        fetchEthPriceUsd(),
      ]);
      const breakdown = gasFeeBreakdownFromWalletEstimate(est, ethUsd, {
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
  }, [erc20Transfer, session?.walletAddress, estimateErc20TransferGas]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15_000);
    return () => clearInterval(id);
  }, [load, targetKey]);

  const hintMessage =
    error === "hint:sign-in"
      ? "Sign in with a wallet so we can call POST /v2/wallet/estimate-gas."
      : error === "hint:no-target"
        ? "Waiting for transfer details (to, amount, token)…"
        : error === "hint:invalid-form"
          ? "Enter valid To, Amount, and token contract (0x…) for the ERC-20 transfer."
          : "";

  if (loading && !fee) {
    return <p className="muted small">Estimating gas via wallet API…</p>;
  }
  if (hintMessage && !fee) {
    return <p className="muted small">{hintMessage}</p>;
  }
  if (error && !fee) {
    return (
      <p className="balance-error">
        {error}{" "}
        <button type="button" className="link-btn" onClick={() => void load()}>
          Retry
        </button>
      </p>
    );
  }
  if (!fee) return null;

  const mult = fee.multiplier !== 1 ? ` (×${fee.multiplier} relayer markup)` : "";

  return (
    <div className="gas-fee-panel">
      <p className="small muted">
        Wallet API (POST /v2/wallet/estimate-gas) · ~{fee.gasUnits.toLocaleString()} gas units (with buffer)
      </p>
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
          <strong>
            {fee.feeAmountToken.toFixed(6)} {tokenSymbol}
          </strong>
        </li>
      </ul>
      <p className="muted small">
        ETH @ ${fee.ethPriceUsd.toFixed(2)} (CoinGecko) · gas price {fee.gasPriceWei.toString()} wei
      </p>
    </div>
  );
}
