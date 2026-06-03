import { useEffect, useMemo, useState } from "react";
import { BackendGasEstimateBlock } from "../../components/wallet/BackendGasEstimateBlock";
import { GasFeeEstimatePanel } from "../../components/relay/GasFeeEstimatePanel";
import { useAuth } from "../../context/AuthContext";
import { useWalletActions } from "../../hooks/useWalletActions";
import type { GasFeeBreakdown } from "../../lib/gasFeeEstimate";
import type { EstimateGasApiResponse } from "../../lib/walletEstimateGas";
import { DEMO_ERC20 } from "../../lib/demoToken";
import { resolveFeeRecipient } from "../../lib/stablieeConfig";
import { JsonOut } from "../../components/ui/JsonOut";
import { btn, btnGhost, card, inputStyle, labelStyle, row } from "../../styles/ui";

type Tab = "sponsor" | "stabliee";

export default function RelayPage() {
  const { chainId } = useAuth();
  const { sendGasless, sendGaslessWithFee, fetchTokenBalance, estimateErc20TransferGas } =
    useWalletActions();
  const [tab, setTab] = useState<Tab>("sponsor");

  return (
    <div className="page">
      <header className="page-header">
        <h1>Gasless lane</h1>
        <p className="muted">Relayer flows — sponsor gas tank or Stabliee-style user-paid gas fee.</p>
      </header>

      <div className="relay-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "sponsor"}
          className={`relay-tab${tab === "sponsor" ? " active" : ""}`}
          onClick={() => setTab("sponsor")}
        >
          Sponsor gasless
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "stabliee"}
          className={`relay-tab${tab === "stabliee" ? " active" : ""}`}
          onClick={() => setTab("stabliee")}
        >
          user pays gas fee
        </button>
      </div>

      <section style={card}>
        {tab === "sponsor" ? (
          <SponsorTab
            sendGasless={sendGasless}
            fetchTokenBalance={fetchTokenBalance}
            estimateErc20TransferGas={estimateErc20TransferGas}
          />
        ) : (
          <StablieeTab
            chainId={chainId}
            sendGaslessWithFee={sendGaslessWithFee}
            fetchTokenBalance={fetchTokenBalance}
          />
        )}
      </section>
    </div>
  );
}

function SponsorTab({
  sendGasless,
  fetchTokenBalance,
  estimateErc20TransferGas,
}: {
  sendGasless: ReturnType<typeof useWalletActions>["sendGasless"];
  fetchTokenBalance: ReturnType<typeof useWalletActions>["fetchTokenBalance"];
  estimateErc20TransferGas: ReturnType<typeof useWalletActions>["estimateErc20TransferGas"];
}) {
  const native = false;
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<string>(DEMO_ERC20.address);
  const [decimals, setDecimals] = useState(String(DEMO_ERC20.decimals));
  const [currency] = useState("ETH");
  const [nativeCur, setNativeCur] = useState("ETH");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [balBusy, setBalBusy] = useState(false);
  const [out, setOut] = useState("");
  const [tokenBal, setTokenBal] = useState("");
  const [gasEstimate, setGasEstimate] = useState<EstimateGasApiResponse | null>(null);
  const [gasLoading, setGasLoading] = useState(false);
  const [gasError, setGasError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const t = to.trim();
    const tok = token.trim();
    const amt = Number(amount);
    if (!/^0x[a-fA-F0-9]{40}$/.test(t) || !/^0x[a-fA-F0-9]{40}$/.test(tok)) {
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
      void estimateErc20TransferGas({ to: t, amount: amt, tokenAddress: tok })
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
  }, [to, amount, token, estimateErc20TransferGas]);

  const disabled = busy || !to.trim() || !amount.trim() || (!native && !token.trim());
  const hint = useMemo(() => {
    const p: string[] = [];
    if (!to.trim()) p.push("to address");
    if (!amount.trim()) p.push("amount");
    if (!native && !token.trim()) p.push("token contract");
    return p.length ? `Fill: ${p.join(", ")}` : "";
  }, [to, amount, native, token]);

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
    <>
      <p className="muted small" style={{ marginBottom: 12 }}>
        POST /relayer/send-transaction — sponsor pays gas from the project gas tank.
      </p>
      {/* <label style={{ display: "flex", gap: 8, marginBottom: 12, fontSize: 14 }}>
        <input type="checkbox" checked={native} onChange={(e) => setNative(e.target.checked)} />
        Native transfer (no token address)
      </label> */}
      <RelayFields
        native={native}
        token={token}
        setToken={setToken}
        decimals={decimals}
        setDecimals={setDecimals}
        nativeCur={nativeCur}
        setNativeCur={setNativeCur}
        to={to}
        setTo={setTo}
        amount={amount}
        setAmount={setAmount}
        refNo={ref}
        setRefNo={setRef}
      />
      <p className="muted small" style={{ marginTop: 12 }}>
        On-chain gas (sponsored by relayer — estimate below is informational):
      </p>
      <BackendGasEstimateBlock loading={gasLoading} error={gasError} estimate={gasEstimate} />
      {!native && (
        <button
          type="button"
          style={btnGhost}
          disabled={balBusy}
          onClick={async () => {
            setBalBusy(true);
            try {
              setTokenBal(await fetchTokenBalance(token, currency));
            } catch (e) {
              setTokenBal(String((e as Error).message));
            } finally {
              setBalBusy(false);
            }
          }}
        >
          {balBusy ? "…" : "Check token balance"}
        </button>
      )}
      {tokenBal && <JsonOut label="Token balance">{tokenBal}</JsonOut>}
      <button type="button" style={{ ...btn, marginTop: 12 }} disabled={disabled} onClick={submit}>
        {busy ? "Sending…" : "Send gasless"}
      </button>
      {hint && <p className="muted small">{hint}</p>}
      {out && <JsonOut label="Relayer">{out}</JsonOut>}
    </>
  );
}

function StablieeTab({
  chainId,
  sendGaslessWithFee,
  fetchTokenBalance,
}: {
  chainId: string;
  sendGaslessWithFee: ReturnType<typeof useWalletActions>["sendGaslessWithFee"];
  fetchTokenBalance: ReturnType<typeof useWalletActions>["fetchTokenBalance"];
}) {
  const feeRecipientDefault = resolveFeeRecipient(chainId);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<string>(DEMO_ERC20.address);
  const [decimals, setDecimals] = useState(String(DEMO_ERC20.decimals));
  const [feeRecipient, setFeeRecipient] = useState(feeRecipientDefault);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [balBusy, setBalBusy] = useState(false);
  const [out, setOut] = useState("");
  const [tokenBal, setTokenBal] = useState("");
  const [gasFee, setGasFee] = useState<GasFeeBreakdown | null>(null);

  const erc20ForFee = useMemo(() => {
    const t = to.trim();
    const tok = token.trim();
    const a = Number(amount);
    if (!/^0x[a-fA-F0-9]{40}$/.test(t) || !/^0x[a-fA-F0-9]{40}$/.test(tok) || !Number.isFinite(a) || a <= 0) {
      return null;
    }
    return { to: t, amount: a, tokenAddress: tok };
  }, [to, amount, token]);

  const feeAmount = gasFee?.feeAmountToken ?? 0;
  const disabled =
    busy || !to.trim() || !amount.trim() || !token.trim() || !feeRecipient.trim() || feeAmount <= 0;

  const submit = async () => {
    if (!gasFee || gasFee.feeAmountToken <= 0) return;
    setBusy(true);
    setOut("");
    try {
      const data = await sendGaslessWithFee({
        to,
        amount: Number(amount),
        tokenAddress: token,
        tokenDecimals: parseInt(decimals, 10),
        feeRecipient,
        feeAmount: gasFee.feeAmountToken,
        currency: DEMO_ERC20.symbol,
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
    <>
      <p className="muted small" style={{ marginBottom: 12 }}>
        POST /relayer/send-transaction-with-fee — gas fee is deducted from the user in ERC-20 and sent to the
        dapp owner. Relayer still sponsors on-chain gas.
      </p>
      <RelayFields
        native={false}
        token={token}
        setToken={setToken}
        decimals={decimals}
        setDecimals={setDecimals}
        nativeCur="ETH"
        setNativeCur={() => undefined}
        to={to}
        setTo={setTo}
        amount={amount}
        setAmount={setAmount}
        refNo={ref}
        setRefNo={setRef}
        hideNative
      />
      <div style={{ marginTop: 12 }}>
        <div style={labelStyle}>Dapp owner (fee recipient)</div>
        <input style={inputStyle} value={feeRecipient} onChange={(e) => setFeeRecipient(e.target.value)} />
      </div>
      <GasFeeEstimatePanel
        chainId={chainId}
        tokenSymbol="KC"
        onFeeReady={setGasFee}
        erc20Transfer={erc20ForFee}
      />
      <button
        type="button"
        style={btnGhost}
        disabled={balBusy}
        onClick={async () => {
          setBalBusy(true);
          try {
            setTokenBal(await fetchTokenBalance(token, DEMO_ERC20.symbol));
          } catch (e) {
            setTokenBal(String((e as Error).message));
          } finally {
            setBalBusy(false);
          }
        }}
      >
        {balBusy ? "…" : "Check token balance"}
      </button>
      {tokenBal && <JsonOut label="Token balance">{tokenBal}</JsonOut>}
      <p className="small muted" style={{ marginTop: 8 }}>
        Total debited from user: {(Number(amount) || 0) + feeAmount} KC (amount + gas fee)
      </p>
      <button type="button" style={{ ...btn, marginTop: 12 }} disabled={disabled} onClick={submit}>
        {busy ? "Sending…" : "Send with gas fee"}
      </button>
      {feeAmount <= 0 && !busy && (
        <p className="muted small">Wait for gas estimate before sending.</p>
      )}
      {out && <JsonOut label="Relayer">{out}</JsonOut>}
    </>
  );
}

function RelayFields(props: {
  native: boolean;
  hideNative?: boolean;
  token: string;
  setToken: (v: string) => void;
  decimals: string;
  setDecimals: (v: string) => void;
  nativeCur: string;
  setNativeCur: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  refNo: string;
  setRefNo: (v: string) => void;
}) {
  const {
    native,
    hideNative,
    token,
    setToken,
    decimals,
    setDecimals,
    nativeCur,
    setNativeCur,
    to,
    setTo,
    amount,
    setAmount,
    refNo,
    setRefNo,
  } = props;

  return (
    <div style={row}>
      {!hideNative && !native && (
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
      {hideNative && (
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
      {!hideNative && native && (
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
          <div style={labelStyle}>Amount (to recipient)</div>
          <input style={inputStyle} type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <div style={labelStyle}>Reference</div>
          <input style={inputStyle} value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="stabliee-tx-1" />
        </div>
      </div>
    </div>
  );
}
