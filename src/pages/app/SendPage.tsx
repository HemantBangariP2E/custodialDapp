import { useState } from "react";
import { useWalletActions } from "../../hooks/useWalletActions";
import { JsonOut } from "../../components/ui/JsonOut";
import { btn, card, inputStyle, labelStyle, row } from "../../styles/ui";

export default function SendPage() {
  const { sendNative } = useWalletActions();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("ETH");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");

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
        <button type="button" style={btn} disabled={busy || !to.trim()} onClick={submit}>
          {busy ? "Sending…" : "Send native"}
        </button>
        {out && <JsonOut label="Result">{out}</JsonOut>}
      </section>
    </div>
  );
}
