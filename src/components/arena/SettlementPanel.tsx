import { useEffect, useState } from "react";
import { GasFeeEstimatePanel } from "../relay/GasFeeEstimatePanel";
import { useAuth } from "../../context/AuthContext";
import { useWalletActions } from "../../hooks/useWalletActions";
import { DEMO_ERC20 } from "../../lib/demoToken";
import type { GasFeeBreakdown } from "../../lib/gasFeeEstimate";
import type { ArenaRoom } from "../../lib/arenaTypes";
import { resolveFeeRecipient } from "../../lib/stablieeConfig";
import { JsonOut } from "../ui/JsonOut";
import { btn, btnGhost, card } from "../../styles/ui";

function eqAddr(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

/** 1 = native (user pays gas) · 2 = sponsor gasless ERC-20 · 3 = user pays gas fee in ERC-20 */
type PayMode = "native" | "gasless_sponsor" | "gasless_user_fee";

const MODE_LABEL: Record<PayMode, string> = {
  native: "native transfer (you pay gas)",
  gasless_sponsor: "gasless sponsor (ERC-20)",
  gasless_user_fee: "gasless + you pay gas in ERC-20",
};

type Props = {
  room: ArenaRoom;
  myAddress: string;
  winnerAddress: string;
  loserAddress: string;
};

export function SettlementPanel({ room, myAddress, winnerAddress, loserAddress }: Props) {
  const { chainId } = useAuth();
  const { sendNative, sendGasless, sendGaslessWithFee, fetchNativeBalance, balanceOut, balBusy } =
    useWalletActions();
  const [mode, setMode] = useState<PayMode>("gasless_sponsor");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [paidVia, setPaidVia] = useState<PayMode | null>(null);
  const [gasFee, setGasFee] = useState<GasFeeBreakdown | null>(null);

  const feeRecipient = resolveFeeRecipient(chainId);
  const iLost = eqAddr(myAddress, loserAddress) && room.winner !== "draw";
  const iWon = eqAddr(myAddress, winnerAddress) && room.winner !== "draw";

  const stakeLabel = `${room.stake} ${DEMO_ERC20.symbol}`;
  const relayerCurrency = "ETH";
  const gasFeeToken = gasFee?.feeAmountToken ?? 0;

  useEffect(() => {
    if (iLost) void fetchNativeBalance();
  }, [iLost, fetchNativeBalance]);

  const ensureLoser = (): boolean => {
    if (!iLost) {
      setOut("Only the loser can pay the stake.");
      return false;
    }
    if (!winnerAddress.trim() || eqAddr(winnerAddress, loserAddress)) {
      setOut("Invalid winner address for settlement.");
      return false;
    }
    return true;
  };

  const payNative = async () => {
    if (!ensureLoser()) return;
    setBusy(true);
    setOut("");
    try {
      const data = await sendNative(winnerAddress.trim(), room.stake, "ETH");
      setOut(JSON.stringify(data, null, 2));
      setPaidVia("native");
    } catch (e) {
      setOut(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const payGaslessSponsor = async () => {
    if (!ensureLoser()) return;
    setBusy(true);
    setOut("");
    try {
      const data = await sendGasless({
        to: winnerAddress.trim(),
        amount: room.stake,
        native: false,
        tokenAddress: DEMO_ERC20.address,
        tokenDecimals: DEMO_ERC20.decimals,
        currency: relayerCurrency,
        nativeCurrency: relayerCurrency,
      });
      setOut(JSON.stringify(data, null, 2));
      setPaidVia("gasless_sponsor");
    } catch (e) {
      setOut(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const payGaslessUserFee = async () => {
    if (!ensureLoser()) return;
    if (!gasFee || gasFee.feeAmountToken <= 0) {
      setOut("Wait for gas fee estimate, then try again.");
      return;
    }
    setBusy(true);
    setOut("");
    try {
      const data = await sendGaslessWithFee({
        to: winnerAddress.trim(),
        amount: room.stake,
        tokenAddress: DEMO_ERC20.address,
        tokenDecimals: DEMO_ERC20.decimals,
        feeRecipient,
        feeAmount: gasFee.feeAmountToken,
        currency: relayerCurrency,
      });
      setOut(JSON.stringify(data, null, 2));
      setPaidVia("gasless_user_fee");
    } catch (e) {
      setOut(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  if (room.winner === "draw") {
    return (
      <section style={card} className="settle-panel">
        <h3>Draw</h3>
        <p className="muted">No stake transfer — play again?</p>
      </section>
    );
  }

  return (
    <section style={card} className="settle-panel">
      <h3>Settlement</h3>
      <p className="muted small">
        Loser pays <strong>{stakeLabel}</strong> to the winner.
      </p>
      <p className="mono break">
        <span className="label">Winner</span>
        <br />
        {winnerAddress}
      </p>

      {iWon && <p className="settle-win">You won — wait for the loser to send the stake.</p>}

      {iLost && (
        <>
          {paidVia ? (
            <p className="settle-win">Payment submitted via {MODE_LABEL[paidVia]}.</p>
          ) : (
            <>
              <p className="label" style={{ marginTop: 16 }}>
                Choose how to pay
              </p>
              <div className="arena-tabs settle-tabs settle-tabs-three">
                <button
                  type="button"
                  className={mode === "native" ? "tab active" : "tab"}
                  onClick={() => setMode("native")}
                >
                  1. Native
                  <span className="tab-sub">You pay gas (ETH)</span>
                </button>
                <button
                  type="button"
                  className={mode === "gasless_sponsor" ? "tab active" : "tab"}
                  onClick={() => setMode("gasless_sponsor")}
                >
                  2. Gasless sponsor
                  <span className="tab-sub">ERC-20 · sponsor pays gas</span>
                </button>
                <button
                  type="button"
                  className={mode === "gasless_user_fee" ? "tab active" : "tab"}
                  onClick={() => setMode("gasless_user_fee")}
                >
                  3. Gasless + your gas fee
                  <span className="tab-sub">ERC-20 fee to dapp owner</span>
                </button>
              </div>

              <p className="mono break small" style={{ marginBottom: 12 }}>
                From (you): {myAddress}
                <br />
                To (winner): {winnerAddress}
              </p>

              {mode === "native" && (
                <div className="settle-option">
                  <h4 className="settle-option-title">1. Native — you pay gas</h4>
                  <p className="muted small">
                    <code>POST /v2/wallet/send-transaction</code>
                    <br />
                    Sends stake in <strong>native ETH</strong>. Network gas is deducted from your ETH
                    balance (you pay gas).
                  </p>
                  {balanceOut && <JsonOut label="Your native balance">{balanceOut}</JsonOut>}
                  <button type="button" style={btn} disabled={busy || balBusy} onClick={payNative}>
                    {busy ? "Sending…" : `Pay ${room.stake} ETH (native)`}
                  </button>
                </div>
              )}

              {mode === "gasless_sponsor" && (
                <div className="settle-option">
                  <h4 className="settle-option-title">2. Gasless sponsor — ERC-20</h4>
                  <p className="muted small">
                    <code>POST /relayer/send-transaction</code>
                    <br />
                    Sends <strong>{stakeLabel}</strong> to the winner. Project <strong>sponsor</strong> pays
                    on-chain gas (gas tank). You only spend the token amount.
                  </p>
                  <p className="muted small">
                    Token <span className="mono">{DEMO_ERC20.address}</span> ·{" "}
                    <code>currency: {relayerCurrency}</code>
                  </p>
                  <button type="button" style={btn} disabled={busy} onClick={payGaslessSponsor}>
                    {busy ? "Sending…" : `Pay ${stakeLabel} (sponsor gasless)`}
                  </button>
                </div>
              )}

              {mode === "gasless_user_fee" && (
                <div className="settle-option">
                  <h4 className="settle-option-title">3. Gasless — you pay gas in ERC-20</h4>
                  <p className="muted small">
                    <code>POST /relayer/send-transaction-with-fee</code>
                    <br />
                    Winner gets <strong>{stakeLabel}</strong>. You also pay an estimated <strong>gas fee</strong>{" "}
                    in {DEMO_ERC20.symbol} to the dapp owner. Sponsor still pays on-chain gas.
                  </p>
                  <p className="mono break small">
                    Fee recipient (dapp owner): {feeRecipient}
                  </p>
                  <GasFeeEstimatePanel
                    chainId={chainId}
                    tokenSymbol={DEMO_ERC20.symbol}
                    onFeeReady={setGasFee}
                  />
                  <p className="small" style={{ marginTop: 8 }}>
                    Total from you: <strong>{(Number(room.stake) + gasFeeToken).toFixed(6)}</strong>{" "}
                    {DEMO_ERC20.symbol} ({room.stake} stake + {gasFeeToken.toFixed(6)} gas fee)
                  </p>
                  <button
                    type="button"
                    style={btn}
                    disabled={busy || gasFeeToken <= 0}
                    onClick={payGaslessUserFee}
                  >
                    {busy ? "Sending…" : `Pay ${stakeLabel} + gas fee`}
                  </button>
                  {gasFeeToken <= 0 && !busy && (
                    <p className="muted small">Waiting for gas estimate…</p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {!iLost && !iWon && (
        <p className="muted small">Spectating — only the loser signs the transfer.</p>
      )}

      {out && <JsonOut label="Transaction result">{out}</JsonOut>}

      {iLost && !paidVia && mode === "native" && (
        <button
          type="button"
          style={{ ...btnGhost, marginTop: 12 }}
          disabled={balBusy}
          onClick={() => void fetchNativeBalance()}
        >
          {balBusy ? "Refreshing…" : "Refresh native balance"}
        </button>
      )}
    </section>
  );
}
