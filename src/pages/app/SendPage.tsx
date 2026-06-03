import { useEffect, useState } from "react";
import { BackendGasEstimateBlock } from "../../components/wallet/BackendGasEstimateBlock";
import { useWalletActions } from "../../hooks/useWalletActions";
import type { EstimateGasApiResponse } from "../../lib/walletEstimateGas";
import { JsonOut } from "../../components/ui/JsonOut";
import { btn, card, inputStyle, labelStyle, row } from "../../styles/ui";

export default function SendPage() {
  const { sendNative, estimateNativeTransferGas, session } = useWalletActions();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("ETH");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [gasEstimate, setGasEstimate] = useState<EstimateGasApiResponse | null>(null);
  const [gasLoading, setGasLoading] = useState(false);
  const [gasError, setGasError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const t = to.trim();
    const amt = Number(amount);
    if (!session?.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(t)) {
      setGasEstimate(null);
      setGasError("");
      setGasLoading(false);
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setGasEstimate(null);
      setGasError("");
      setGasLoading(false);
      return;
    }
    setGasLoading(true);
    setGasError("");
    const timer = window.setTimeout(() => {
      void estimateNativeTransferGas(t, amt)
        .then((r) => {
          if (cancelled) return;
          setGasEstimate(r);
          setGasError("");
        })
        .catch((e) => {
          if (cancelled) return;
          setGasEstimate(null);
          setGasError(String((e as Error).message));
        })
        .finally(() => {
          if (!cancelled) setGasLoading(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [to, amount, session?.walletAddress, estimateNativeTransferGas]);

  const submit = async () => {
    setBusy(true);
    setOut("");
    try {
      const data = await sendNative(to, Number(amount), currency);
      setOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setOut(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Transfer</h1>
        <p className="muted">POST /v2/wallet/send-transaction — custodial wallet pays gas.</p>
      </header>
      <section style={card}>
        <div style={row}>
          <div>
            <div style={labelStyle}>To</div>
            <input style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x…" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={labelStyle}>Amount</div>
              <input style={inputStyle} type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <div style={labelStyle}>Currency</div>
              <input style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>
        </div>
        <BackendGasEstimateBlock loading={gasLoading} error={gasError} estimate={gasEstimate} />
        <button type="button" style={btn} disabled={busy || !to.trim()} onClick={submit}>
          {busy ? "Sending…" : "Send native"}
        </button>
        {out && <JsonOut label="Result">{out}</JsonOut>}
      </section>
    </div>
  );
}
