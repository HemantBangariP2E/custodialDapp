export type RpsMove = "rock" | "paper" | "scissors";

export type RoomStatus = "waiting" | "playing" | "revealed";

export type ArenaPlayer = {
  address: string;
  label: string;
  move: RpsMove | null;
  locked: boolean;
};

export type ArenaRoom = {
  id: string;
  stake: number;
  currency: string;
  status: RoomStatus;
  host: ArenaPlayer;
  guest: ArenaPlayer | null;
  winner: "host" | "guest" | "draw" | null;
};

export type ArenaClientMessage =
  | { type: "CREATE_ROOM"; stake: number; currency: string; player: { address: string; label: string } }
  | { type: "JOIN_ROOM"; roomId: string; player: { address: string; label: string } }
  | { type: "LOCK_MOVE"; roomId: string; move: RpsMove }
  | { type: "GET_ROOM"; roomId: string; player?: { address: string; label: string } };

export type ArenaServerMessage =
  | { type: "ROOM_CREATED"; roomId: string }
  | { type: "ROOM_STATE"; room: ArenaRoom }
  | { type: "ERROR"; message: string };
