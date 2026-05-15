/**
 * Multiplayer rock / paper / scissors rooms for Vault Arena.
 * Run: node server/arena-ws.mjs  (port 5181, or ARENA_WS_PORT)
 */
import { WebSocketServer } from "ws";
import { randomBytes } from "crypto";

/** Railway/Render set PORT; local dev may use ARENA_WS_PORT. */
const PORT = Number(process.env.PORT || process.env.ARENA_WS_PORT || 5181);
/** @type {Map<string, object>} */
const rooms = new Map();

function newRoomId() {
  return randomBytes(3).toString("hex");
}

function player(address, label) {
  return { address, label, move: null, locked: false };
}

function publicRoom(room) {
  const reveal = room.status === "revealed";
  return {
    id: room.id,
    stake: room.stake,
    currency: room.currency,
    status: room.status,
    host: {
      ...room.host,
      move: reveal ? room.host.move : null,
      locked: room.host.locked,
    },
    guest: room.guest
      ? {
          ...room.guest,
          move: reveal ? room.guest.move : null,
          locked: room.guest.locked,
        }
      : null,
    winner: room.winner,
  };
}

function compare(a, b) {
  if (a === b) return 0;
  if (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  ) {
    return 1;
  }
  return -1;
}

function resolveWinner(room) {
  const c = compare(room.host.move, room.guest.move);
  if (c === 0) room.winner = "draw";
  else if (c > 0) room.winner = "host";
  else room.winner = "guest";
  room.status = "revealed";
}

function broadcast(room) {
  const payload = JSON.stringify({ type: "ROOM_STATE", room: publicRoom(room) });
  for (const ws of room.sockets) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

const wss = new WebSocketServer({ port: PORT });
console.log(`Arena WS listening on port ${PORT}`);

wss.on("connection", (ws) => {
  ws._roomId = null;
  ws._playerAddress = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return send(ws, { type: "ERROR", message: "Invalid JSON" });
    }

    if (msg.type === "CREATE_ROOM") {
      const stake = Number(msg.stake);
      if (!Number.isFinite(stake) || stake <= 0) {
        return send(ws, { type: "ERROR", message: "Stake must be positive" });
      }
      const id = newRoomId();
      const room = {
        id,
        stake,
        currency: String(msg.currency || "ETH").trim() || "ETH",
        status: "waiting",
        host: player(msg.player.address, msg.player.label),
        guest: null,
        winner: null,
        sockets: new Set([ws]),
      };
      ws._roomId = id;
      ws._playerAddress = msg.player.address;
      rooms.set(id, room);
      send(ws, { type: "ROOM_CREATED", roomId: id });
      broadcast(room);
      return;
    }

    if (msg.type === "JOIN_ROOM") {
      const room = rooms.get(msg.roomId);
      if (!room) return send(ws, { type: "ERROR", message: "Room not found" });
      if (room.host.address.toLowerCase() === msg.player.address.toLowerCase()) {
        room.sockets.add(ws);
        ws._roomId = room.id;
        ws._playerAddress = msg.player.address;
        return send(ws, { type: "ROOM_STATE", room: publicRoom(room) });
      }
      if (room.guest && room.guest.address.toLowerCase() !== msg.player.address.toLowerCase()) {
        return send(ws, { type: "ERROR", message: "Room is full" });
      }
      room.guest = room.guest || player(msg.player.address, msg.player.label);
      room.status = "playing";
      room.sockets.add(ws);
      ws._roomId = room.id;
      ws._playerAddress = msg.player.address;
      broadcast(room);
      return;
    }

    if (msg.type === "GET_ROOM") {
      const room = rooms.get(msg.roomId);
      if (!room) return send(ws, { type: "ERROR", message: "Room not found" });
      room.sockets.add(ws);
      ws._roomId = room.id;
      if (msg.player?.address) ws._playerAddress = msg.player.address;
      send(ws, { type: "ROOM_STATE", room: publicRoom(room) });
      return;
    }

    if (msg.type === "LOCK_MOVE") {
      const room = rooms.get(msg.roomId);
      if (!room) return send(ws, { type: "ERROR", message: "Room not found" });
      if (room.status !== "playing") {
        return send(ws, { type: "ERROR", message: "Game not in progress" });
      }
      const move = msg.move;
      if (!["rock", "paper", "scissors"].includes(move)) {
        return send(ws, { type: "ERROR", message: "Invalid move" });
      }
      const addr = (ws._playerAddress || "").toLowerCase();
      if (addr === room.host.address.toLowerCase()) {
        if (room.host.locked) return send(ws, { type: "ERROR", message: "Already locked" });
        room.host.move = move;
        room.host.locked = true;
      } else if (room.guest && addr === room.guest.address.toLowerCase()) {
        if (room.guest.locked) return send(ws, { type: "ERROR", message: "Already locked" });
        room.guest.move = move;
        room.guest.locked = true;
      } else {
        return send(ws, { type: "ERROR", message: "Not a player in this room" });
      }
      if (room.host.locked && room.guest?.locked) resolveWinner(room);
      broadcast(room);
      return;
    }

    send(ws, { type: "ERROR", message: "Unknown message type" });
  });

  ws.on("close", () => {
    const id = ws._roomId;
    if (!id) return;
    const room = rooms.get(id);
    if (!room) return;
    room.sockets.delete(ws);
    if (room.sockets.size === 0) {
      setTimeout(() => {
        const r = rooms.get(id);
        if (r && r.sockets.size === 0) rooms.delete(id);
      }, 120_000);
    }
  });
});
