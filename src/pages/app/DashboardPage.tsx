import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef } from "react";
import { CopyButton } from "../../components/ui/CopyButton";
import { useAuth } from "../../context/AuthContext";
import { DEMO_ERC20 } from "../../lib/demoToken";
import { formatErc20Line, formatNativeLine } from "../../lib/formatBalance";
import { useWalletActions } from "../../hooks/useWalletActions";
import { btnGhost, card } from "../../styles/ui";

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
  const {
    nativeBalanceOut,
    tokenBalanceOut,
    nativeBalanceError,
    tokenBalanceError,
    balBusy,
    refreshBalances,
  } = useWalletActions();

  const initialLoad = useRef(false);
  const wallet = session?.walletAddress ?? "";
  const nativeSymbol = "ETH";

  const nativeLine = useMemo(() => {
    const p = parseBalanceJson(nativeBalanceOut);
    if (!p) return null;
    const line = formatNativeLine(p, nativeSymbol);
    return line === "—" ? null : line;
  }, [nativeBalanceOut, nativeSymbol]);

  const erc20Line = useMemo(() => {
    const p = parseBalanceJson(tokenBalanceOut);
    if (!p) return null;
    const line = formatErc20Line(p);
    return line === "—" ? null : line;
  }, [tokenBalanceOut]);

  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    void refreshBalances(DEMO_ERC20.address, DEMO_ERC20.symbol);
  }, [refreshBalances]);

  const reload = () => void refreshBalances(DEMO_ERC20.address, DEMO_ERC20.symbol);

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
            {wallet && <CopyButton text={wallet} label="Copy address" />}
          </div>
        </article>

        <article style={card} className="dash-balances">
          <div className="balance-head">
            <p className="label">Balances</p>
            <button type="button" style={btnGhost} disabled={balBusy} onClick={reload}>
              {balBusy ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="balance-block">
            <p className="balance-title">Native</p>
            {nativeLine && <p className="balance-amount">{nativeLine}</p>}
            {nativeBalanceError && <p className="balance-error">{nativeBalanceError}</p>}
            {!nativeLine && !nativeBalanceError && (
              <p className="muted small">{balBusy ? "Loading…" : "—"}</p>
            )}
          </div>

          <div className="balance-block">
            <p className="balance-title">ERC-20</p>
            {erc20Line && <p className="balance-amount">{erc20Line}</p>}
            {tokenBalanceError && <p className="balance-error">{tokenBalanceError}</p>}
            {!erc20Line && !tokenBalanceError && (
              <p className="muted small">{balBusy ? "Loading…" : "—"}</p>
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
