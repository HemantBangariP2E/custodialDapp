import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SettlementPanel } from "../../components/arena/SettlementPanel";
import { useAuth } from "../../context/AuthContext";
import { useArenaSocket } from "../../hooks/useArenaSocket";
import type { ArenaRoom, RpsMove } from "../../lib/arenaTypes";
import { RPS_EMOJI, RPS_MOVES } from "../../lib/rps";
import {
  ARENA_DEV_SETUP_HINT,
  ARENA_PROD_SETUP_HINT,
  arenaWsDisplayUrl,
  isArenaWsConfigured,
} from "../../lib/arenaSocketUrl";
import { btn, btnGhost, card, inputStyle } from "../../styles/ui";

function eqAddr(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function winnerAddresses(room: ArenaRoom) {
  if (!room.guest || room.winner === "draw" || !room.winner) {
    return { winner: "", loser: "" };
  }
  if (room.winner === "host") {
    return { winner: room.host.address, loser: room.guest.address };
  }
  return { winner: room.guest.address, loser: room.host.address };
}

export default function ArenaRoomPage() {
  const { roomId: paramId } = useParams<{ roomId: string }>();
  const { session } = useAuth();
  const { connected, room, error, joinRoom, syncRoom, lockMove, setError } = useArenaSocket();
  const [copied, setCopied] = useState(false);
  const [myMove, setMyMove] = useState<RpsMove | null>(null);

  const roomId = paramId ?? "";
  const myAddr = session?.walletAddress ?? "";
  const myLabel = session?.email ?? myAddr.slice(0, 10);

  const inviteUrl = useMemo(
    () => `${window.location.origin}/app/arena/room/${roomId}`,
    [roomId],
  );

  const isHost = Boolean(room && myAddr && eqAddr(room.host.address, myAddr));
  const isGuest = Boolean(room?.guest && myAddr && eqAddr(room.guest.address, myAddr));
  const canJoin = Boolean(room && myAddr && !isHost && !room.guest);
  const roomFull = Boolean(room?.guest && !isHost && !isGuest);

  const role = isHost ? ("host" as const) : isGuest ? ("guest" as const) : null;

  const { winner, loser } = useMemo(
    () => (room ? winnerAddresses(room) : { winner: "", loser: "" }),
    [room],
  );

  useEffect(() => {
    if (!roomId || !myAddr || !connected) return;
    syncRoom(roomId, myAddr);
  }, [roomId, myAddr, connected, syncRoom]);

  useEffect(() => {
    if (!roomId || !myAddr || !connected || room) return;
    const t = window.setInterval(() => syncRoom(roomId, myAddr), 2500);
    return () => window.clearInterval(t);
  }, [roomId, myAddr, connected, room, syncRoom]);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  };

  const joinAsGuest = () => {
    if (!roomId || !myAddr) return;
    joinRoom(roomId, myAddr, myLabel);
  };

  const pickMove = (move: RpsMove) => {
    if (!roomId || !room || room.status !== "playing") return;
    setMyMove(move);
    lockMove(roomId, move);
  };

  const me = role === "host" ? room?.host : role === "guest" ? room?.guest : null;
  const opponent = role === "host" ? room?.guest : role === "guest" ? room?.host : null;
  const iLocked = me?.locked ?? false;
  const oppLocked = opponent?.locked ?? false;

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/app/arena" className="auth-back">
          ← Arena lobby
        </Link>
        <h1>Match · {roomId}</h1>
        <p className="muted">
          {connected ? "Live room" : "Connecting to arena server…"}
          {room && ` · Stake ${room.stake} ${room.currency}`}
        </p>
      </header>

      {error && <p className="form-msg error">{error}</p>}

      {!connected && (
        <section style={card}>
          <p className="warn-box">
            {!isArenaWsConfigured()
              ? ARENA_PROD_SETUP_HINT
              : `Connecting to ${arenaWsDisplayUrl()}… ${
                  import.meta.env.DEV ? ARENA_DEV_SETUP_HINT : "Ensure the arena server is reachable."
                }`}
          </p>
        </section>
      )}

      {connected && !room && roomId && (
        <section style={card}>
          <p className="muted">Loading room…</p>
          <p className="muted small">
            If this persists, the room may have expired (server restarted). Ask the host to create a new room.
          </p>
          <button type="button" style={btnGhost} onClick={() => syncRoom(roomId, myAddr)}>
            Retry load
          </button>
        </section>
      )}

      {room && (
        <>
          <section style={card} className="room-players">
            <div>
              <span className="label">Host</span>
              <p className="mono small">{room.host.label}</p>
              <p className="mono break">{room.host.address}</p>
              {room.status === "playing" && (
                <span className="lock-badge">{room.host.locked ? "Locked ✓" : "Choosing…"}</span>
              )}
            </div>
            <div className="vs">VS</div>
            <div>
              <span className="label">Guest</span>
              {room.guest ? (
                <>
                  <p className="mono small">{room.guest.label}</p>
                  <p className="mono break">{room.guest.address}</p>
                  {room.status === "playing" && (
                    <span className="lock-badge">{room.guest.locked ? "Locked ✓" : "Choosing…"}</span>
                  )}
                </>
              ) : (
                <p className="muted">Waiting for opponent…</p>
              )}
            </div>
          </section>

          {isHost && !room.guest && (
            <section style={card}>
              <h3>Invite opponent</h3>
              <p className="muted small">
                Share this link. They must sign in with a <strong>different email</strong> (different custodial
                wallet) — not the same account as you.
              </p>
              <input style={inputStyle} readOnly value={inviteUrl} />
              <button type="button" style={btn} onClick={copyInvite}>
                {copied ? "Copied!" : "Copy invite link"}
              </button>
            </section>
          )}

          {canJoin && (
            <section style={card} className="join-panel">
              <h3>Join this match</h3>
              <p className="muted small">
                Stake: <strong>{room.stake} {room.currency}</strong> — loser pays winner after rock · paper ·
                scissors.
              </p>
              <p className="mono small break">Your wallet: {myAddr}</p>
              <button type="button" style={btn} onClick={joinAsGuest}>
                Join as guest
              </button>
            </section>
          )}

          {roomFull && (
            <section style={card}>
              <p className="muted">This room already has a guest. Only two players per match.</p>
            </section>
          )}

          {isHost && room.guest && (
            <section style={card}>
              <p className="muted small">You are the host. Waiting for {room.guest.label} to pick a move…</p>
            </section>
          )}

          {room.status === "playing" && role && !iLocked && (
            <section style={card} className="arena-board">
              <h3>Pick your move</h3>
              <p className="muted small">Moves stay hidden until both players lock.</p>
              <div className="arena-moves rps">
                {RPS_MOVES.map((m) => (
                  <button key={m} type="button" style={btn} onClick={() => pickMove(m)}>
                    {RPS_EMOJI[m]} {m}
                  </button>
                ))}
              </div>
            </section>
          )}

          {room.status === "playing" && role && iLocked && !oppLocked && (
            <section style={card}>
              <p>Move locked. Waiting for opponent…</p>
              {myMove && (
                <p>
                  You chose {RPS_EMOJI[myMove]} {myMove}
                </p>
              )}
            </section>
          )}

          {room.status === "revealed" && (
            <>
              <section style={card} className="reveal-board">
                <h3>Result</h3>
                <div className="reveal-moves">
                  <div>
                    {RPS_EMOJI[room.host.move!]} <strong>{room.host.move}</strong>
                    <span className="label">Host</span>
                  </div>
                  <div>
                    {room.guest?.move && RPS_EMOJI[room.guest.move]}{" "}
                    <strong>{room.guest?.move}</strong>
                    <span className="label">Guest</span>
                  </div>
                </div>
                <p className="arena-result">
                  {room.winner === "draw"
                    ? "Draw — no winner"
                    : room.winner === role
                      ? "You win!"
                      : role
                        ? "You lose — settle below."
                        : "Match over"}
                </p>
              </section>
              {winner && loser && (
                <SettlementPanel
                  room={room}
                  myAddress={myAddr}
                  winnerAddress={winner}
                  loserAddress={loser}
                />
              )}
            </>
          )}
        </>
      )}

      <Link
        to="/app/arena"
        style={{ ...btnGhost, display: "inline-block", marginTop: 16, textDecoration: "none" }}
      >
        Back to lobby
      </Link>
    </div>
  );
}
