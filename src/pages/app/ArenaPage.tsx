import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useArenaSocket } from "../../hooks/useArenaSocket";
import type { RpsMove } from "../../lib/arenaTypes";
import { RPS_EMOJI, RPS_MOVES, compareRps } from "../../lib/rps";
import { btn, card, inputStyle, labelStyle } from "../../styles/ui";

const SCORE_KEY = "vault-arena-score-v1";

function loadScore() {
  try {
    return JSON.parse(localStorage.getItem(SCORE_KEY) ?? "{}") as {
      wins: number;
      losses: number;
    };
  } catch {
    return { wins: 0, losses: 0 };
  }
}

function saveScore(s: { wins: number; losses: number }) {
  localStorage.setItem(SCORE_KEY, JSON.stringify(s));
}

export default function ArenaPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { connected, roomId, error, createRoom, setError } = useArenaSocket();
  const [tab, setTab] = useState<"solo" | "multi">("multi");
  const [stake, setStake] = useState("0.001");
  const [currency, setCurrency] = useState("ETH");
  const [creating, setCreating] = useState(false);

  const [score, setScore] = useState(loadScore);
  const [player, setPlayer] = useState<RpsMove | null>(null);
  const [cpu, setCpu] = useState<RpsMove | null>(null);
  const [result, setResult] = useState("");

  useEffect(() => {
    if (creating && roomId) {
      navigate(`/app/arena/room/${roomId}`, { replace: true });
    }
  }, [creating, roomId, navigate]);

  const playSolo = useCallback(
    (move: RpsMove) => {
      const enemy = RPS_MOVES[Math.floor(Math.random() * 3)]!;
      setPlayer(move);
      setCpu(enemy);
      const c = compareRps(move, enemy);
      let next = { ...score };
      if (c === 0) setResult("Draw.");
      else if (c > 0) {
        next.wins += 1;
        setResult(`You win! ${move} beats ${enemy}.`);
      } else {
        next.losses += 1;
        setResult(`You lose. ${enemy} beats ${move}.`);
      }
      setScore(next);
      saveScore(next);
    },
    [score],
  );

  const hostMatch = () => {
    if (!session?.walletAddress) return;
    const s = Number(stake);
    if (!Number.isFinite(s) || s <= 0) {
      setError("Enter a positive stake amount.");
      return;
    }
    if (!connected) {
      setError("Arena server offline — run npm run arena-server");
      return;
    }
    setCreating(true);
    createRoom(s, currency, session.walletAddress, session.email ?? session.userId);
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Crystal Arena</h1>
        <p className="muted">
          Solo practice or invite a friend for rock · paper · scissors with on-chain settlement.
        </p>
      </header>

      <div className="arena-tabs">
        <button
          type="button"
          className={tab === "multi" ? "tab active" : "tab"}
          onClick={() => setTab("multi")}
        >
          Multiplayer
        </button>
        <button
          type="button"
          className={tab === "solo" ? "tab active" : "tab"}
          onClick={() => setTab("solo")}
        >
          Solo vs CPU
        </button>
      </div>

      {error && <p className="form-msg error">{error}</p>}

      {tab === "multi" && (
        <section style={card}>
          <h3>Host a match</h3>
          <p className="muted small">
            Create a room, share the invite link, both pick moves. Loser sends stake to winner via custodial
            transfer.
          </p>
          {!connected && (
            <p className="warn-box">
              Connecting to arena server at <code>ws://127.0.0.1:5181</code>… If this stays red, restart with{" "}
              <code>npm run dev</code> or run <code>npm run arena-server</code> in a second terminal.
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <div style={labelStyle}>Stake amount</div>
              <input
                style={inputStyle}
                type="number"
                step="any"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
              />
            </div>
            <div>
              <div style={labelStyle}>Currency</div>
              <input style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>
          <button type="button" style={btn} disabled={creating || !connected} onClick={hostMatch}>
            {creating ? "Creating room…" : "Create room & get invite link"}
          </button>
        </section>
      )}

      {tab === "solo" && (
        <>
          <section className="arena-stats" style={card}>
            <div>
              <strong>{score.wins}</strong>
              <span>Wins</span>
            </div>
            <div>
              <strong>{score.losses}</strong>
              <span>Losses</span>
            </div>
          </section>
          <section style={card} className="arena-board">
            <p className="arena-result">{result || "Choose rock, paper, or scissors"}</p>
            <div className="arena-moves rps">
              {RPS_MOVES.map((m) => (
                <button
                  key={m}
                  type="button"
                  style={btn}
                  className={player === m ? "active" : ""}
                  onClick={() => playSolo(m)}
                >
                  {RPS_EMOJI[m]} {m}
                </button>
              ))}
            </div>
            {player && cpu && (
              <p className="muted small">
                You {RPS_EMOJI[player]} · CPU {RPS_EMOJI[cpu]}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
