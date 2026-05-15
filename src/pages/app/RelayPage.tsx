import { useMemo, useState } from "react";
import { useWalletActions } from "../../hooks/useWalletActions";
import { JsonOut } from "../../components/ui/JsonOut";
import { btn, btnGhost, card, inputStyle, labelStyle, row } from "../../styles/ui";

export default function RelayPage() {
  const { sendGasless, fetchTokenBalance } = useWalletActions();
  const [native, setNative] = useState(false);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("0x5aEC77A2CBE8ee9D359F965826BdDFa026DfFb38");
  const [decimals, setDecimals] = useState("18");
  const [currency] = useState("ETH");
  const [nativeCur, setNativeCur] = useState("ETH");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [balBusy, setBalBusy] = useState(false);
  const [out, setOut] = useState("");
  const [tokenBal, setTokenBal] = useState("");

  const disabled =
    busy || !to.trim() || !amount.trim() || (!native && !token.trim());

  const hint = useMemo(() => {
    const p: string[] = [];
    if (!to.trim()) p.push("to address");
    if (!amount.trim()) p.push("amount");
    if (!native && !token.trim()) p.push("token contract");
    return p.length ? `Fill: ${p.join(", ")}` : "";
  }, [to, amount, native, token]);

  const checkTokenBal = async () => {
    setBalBusy(true);
    try {
      setTokenBal(await fetchTokenBalance(token, currency));
    } catch (e) {
      setTokenBal(String((e as Error).message));
    } finally {
      setBalBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setOut("");
    try {
      const data = await sendGasless({
        to,
        amount: Number(amount),
        native,
        tokenAddress: token,
        tokenDecimals: parseInt(decimals, 10),
        currency,
        nativeCurrency: nativeCur,
        referenceNo: ref || undefined,
      });
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
        <h1>Gasless lane</h1>
        <p className="muted">POST /relayer/send-transaction — sponsor pays gas when project is configured.</p>
      </header>
      <section style={card}>
        <label style={{ display: "flex", gap: 8, marginBottom: 12, fontSize: 14 }}>
          <input type="checkbox" checked={native} onChange={(e) => setNative(e.target.checked)} />
          Native transfer (no token address)
        </label>
        <div style={row}>
          {!native && (
            <>
              <div>
                <div style={labelStyle}>Token contract</div>
                <input style={inputStyle} value={token} onChange={(e) => setToken(e.target.value)} />
              </div>
              <div style={{ maxWidth: 120 }}>
                <div style={labelStyle}>Decimals</div>
                <input style={inputStyle} value={decimals} onChange={(e) => setDecimals(e.target.value)} />
              </div>
            </>
          )}
          {native && (
            <div style={{ maxWidth: 140 }}>
              <div style={labelStyle}>Currency</div>
              <input style={inputStyle} value={nativeCur} onChange={(e) => setNativeCur(e.target.value)} />
            </div>
          )}
          <div>
            <div style={labelStyle}>To</div>
            <input style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={labelStyle}>Amount</div>
              <input style={inputStyle} type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <div style={labelStyle}>Reference</div>
              <input style={inputStyle} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="arena-entry-1" />
            </div>
          </div>
        </div>
        {!native && (
          <button type="button" style={btnGhost} disabled={balBusy} onClick={checkTokenBal}>
            {balBusy ? "…" : "Check token balance"}
          </button>
        )}
        {tokenBal && <JsonOut label="Token balance">{tokenBal}</JsonOut>}
        <button type="button" style={{ ...btn, marginTop: 12 }} disabled={disabled} onClick={submit}>
          {busy ? "Sending…" : "Send gasless"}
        </button>
        {hint && <p className="muted small">{hint}</p>}
        {out && <JsonOut label="Relayer">{out}</JsonOut>}
      </section>
    </div>
  );
}
