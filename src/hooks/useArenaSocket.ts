import { useCallback, useEffect, useRef, useState } from "react";
import type { ArenaClientMessage, ArenaRoom, ArenaServerMessage } from "../lib/arenaTypes";
import { arenaSocketUrl } from "../lib/arenaSocketUrl";

const MAX_RETRIES = 8;
const RETRY_MS = 1500;

export function useArenaSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const unmountedRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<ArenaRoom | null>(null);
  const [error, setError] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (unmountedRef.current) return null;
    if (wsRef.current?.readyState === WebSocket.OPEN) return wsRef.current;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return wsRef.current;

    wsRef.current?.close();
    const url = arenaSocketUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      setConnected(true);
      setError("");
    };

    ws.onclose = () => {
      setConnected(false);
      if (unmountedRef.current) return;
      if (retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        window.setTimeout(() => connect(), RETRY_MS);
      } else {
        setError(
          "Arena server unreachable. From project folder run: npm run arena-server (or npm run dev to start Vite + arena together).",
        );
      }
    };

    ws.onerror = () => {
      /* onclose handles retry + final error */
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as ArenaServerMessage;
        if (msg.type === "ROOM_STATE") setRoom(msg.room);
        if (msg.type === "ROOM_CREATED") setRoomId(msg.roomId);
        if (msg.type === "ERROR") setError(msg.message);
      } catch {
        setError("Bad message from arena server");
      }
    };

    return ws;
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const send = useCallback(
    (msg: ArenaClientMessage) => {
      const trySend = () => {
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
          return true;
        }
        return false;
      };
      if (trySend()) return;
      const ws = connect();
      if (!ws) return;
      const fire = () => trySend();
      if (ws.readyState === WebSocket.OPEN) fire();
      else ws.addEventListener("open", fire, { once: true });
    },
    [connect],
  );

  const createRoom = useCallback(
    (stake: number, currency: string, address: string, label: string) => {
      setError("");
      send({
        type: "CREATE_ROOM",
        stake,
        currency,
        player: { address, label },
      });
    },
    [send],
  );

  const joinRoom = useCallback(
    (id: string, address: string, label: string) => {
      setError("");
      setRoomId(id);
      send({ type: "JOIN_ROOM", roomId: id, player: { address, label } });
    },
    [send],
  );

  const syncRoom = useCallback(
    (id: string, address?: string) => {
      setRoomId(id);
      send({
        type: "GET_ROOM",
        roomId: id,
        ...(address ? { player: { address, label: address } } : {}),
      });
    },
    [send],
  );

  const lockMove = useCallback(
    (id: string, move: "rock" | "paper" | "scissors") => {
      setError("");
      send({ type: "LOCK_MOVE", roomId: id, move });
    },
    [send],
  );

  return {
    connected,
    room,
    roomId,
    error,
    createRoom,
    joinRoom,
    syncRoom,
    lockMove,
    setError,
    reconnect: connect,
  };
}
