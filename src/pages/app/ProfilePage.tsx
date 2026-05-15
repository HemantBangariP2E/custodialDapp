import { CHAIN_OPTIONS, optionKey } from "../../chains";
import { useAuth } from "../../context/AuthContext";
import { card, inputStyle, labelStyle } from "../../styles/ui";

export default function ProfilePage() {
  const {
    session,
    selectedChain,
    setSelectedChain,
    chainId,
    setChainId,
    apiKey,
  } = useAuth();

  return (
    <div className="page">
      <header className="page-header">
        <h1>Profile</h1>
        <p className="muted">Session & network settings</p>
      </header>

      <section style={card}>
        <div style={{ marginBottom: 16 }}>
          <p className="label">Email</p>
          <p>{session?.email ?? session?.userId}</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <p className="label">Custodial address</p>
          <p className="mono break">{session?.walletAddress}</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <p className="label">API key (masked)</p>
          <p className="mono">{apiKey ? `${apiKey.slice(0, 8)}…${apiKey.slice(-4)}` : "—"}</p>
        </div>
        <div>
          <div style={labelStyle}>Active network</div>
          <select
            style={inputStyle}
            value={selectedChain ? optionKey(selectedChain) : ""}
            onChange={(e) => {
              const opt = CHAIN_OPTIONS.find((c) => optionKey(c) === e.target.value);
              if (opt) {
                setSelectedChain(opt);
                setChainId(opt.chainId);
              }
            }}
          >
            {CHAIN_OPTIONS.map((c) => (
              <option key={optionKey(c)} value={optionKey(c)}>
                {c.blockchain} · {c.network} · {c.chainId}
              </option>
            ))}
          </select>
          <p className="muted small" style={{ marginTop: 8 }}>
            Chain ID: {chainId}
          </p>
        </div>
      </section>
    </div>
  );
}
