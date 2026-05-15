import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "../../components/ui/CopyButton";
import { useAuth } from "../../context/AuthContext";
import { DEMO_ERC20 } from "../../lib/demoToken";
import { formatBalanceHint, formatErc20Line } from "../../lib/formatBalance";
import { useWalletActions } from "../../hooks/useWalletActions";
import { btnGhost, card, inputStyle, labelStyle } from "../../styles/ui";

const quickLinks = [
  { to: "/app/send", title: "Transfer", desc: "Native send (wallet pays gas)" },
  { to: "/app/relay", title: "Gasless lane", desc: "Relayer ERC-20 / native" },
  { to: "/app/arena", title: "Crystal Arena", desc: "Play rounds & streaks" },
  { to: "/app/contracts", title: "Contracts", desc: "write-transaction" },
];

function parseBalanceJson(raw: string): unknown {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const { session, selectedChain, chainId } = useAuth();
  const { nativeBalanceOut, tokenBalanceOut, balBusy, refreshBalances } = useWalletActions();
  const [tokenAddress, setTokenAddress] = useState<string>(DEMO_ERC20.address);
  const [tokenSymbol, setTokenSymbol] = useState<string>(DEMO_ERC20.symbol);

  const wallet = session?.walletAddress ?? "";

  const nativeHint = useMemo(() => {
    const p = parseBalanceJson(nativeBalanceOut);
    return p ? formatBalanceHint(p) : nativeBalanceOut && !nativeBalanceOut.startsWith("{") ? nativeBalanceOut : "";
  }, [nativeBalanceOut]);

 
  const tokenHint = useMemo(() => {
    const p = parseBalanceJson(tokenBalanceOut);
    return p ? formatErc20Line(p) : tokenBalanceOut && !tokenBalanceOut.startsWith("{") ? tokenBalanceOut : "";
  }, [tokenBalanceOut]);

  useEffect(() => {
    void refreshBalances(DEMO_ERC20.address, DEMO_ERC20.symbol);
  }, [refreshBalances]);

   console.log("render dashboard", { nativeBalanceOut, tokenBalanceOut });

  const reload = () => void refreshBalances(tokenAddress, tokenSymbol);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">
          {selectedChain?.blockchain} · {selectedChain?.network} · chain {chainId}
        </p>
      </header>

      <section className="dash-grid">
        <article style={card}>
          <p className="label">Custodial wallet</p>
          {session?.email && <p className="small muted">{session.email}</p>}
          <div className="wallet-row">
            <p className="mono break wallet-addr">{wallet || "—"}</p>
            {wallet && <CopyButton text={wallet}  />}
          </div>
        </article>

        <article style={card} className="dash-balances">
          <div className="balance-head">
            <p className="label">Balances</p>
            <button type="button" style={btnGhost} disabled={balBusy} onClick={reload}>
              {balBusy ? "Refreshing…" : "Refresh all"}
            </button>
          </div>

          <div className="balance-block">
            <p className="balance-title">Native</p>
            {nativeHint && <p className="balance-amount">{nativeHint}</p>}
            {nativeBalanceOut ? (
              <p className="balance-amount">{nativeBalanceOut}</p>
            ) : (
              <p className="muted small">Loading native balance…</p>
            )}
          </div>

          <div className="balance-block">
            <p className="balance-title">ERC-20 token</p>
            <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
              <div>
                <div style={labelStyle}>Token contract</div>
                <input
                  style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }}
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="0x…"
                />
              </div>
              {/* <div style={{ maxWidth: 120 }}>
                <div style={labelStyle}>Currency label</div>
                <input
                  style={inputStyle}
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                />
              </div> */}
            </div>
            {tokenHint ? (
              <p className="balance-amount">{tokenHint}</p>
            ) : tokenBalanceOut ? (
              <p className="muted small">{tokenBalanceOut}</p>
            ) : (
              <p className="muted small">Loading token balance…</p>
            )}
          </div>
        </article>
      </section>

      <h2 className="section-title">Quick actions</h2>
      <div className="quick-grid">
        {quickLinks.map((q) => (
          <Link key={q.to} to={q.to} className="quick-card">
            <strong>{q.title}</strong>
            <span>{q.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
