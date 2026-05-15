import type { RpsMove } from "./arenaTypes";

/** Returns 1 if a beats b, -1 if b beats a, 0 if tie. */
export function compareRps(a: RpsMove, b: RpsMove): number {
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

export const RPS_MOVES: RpsMove[] = ["rock", "paper", "scissors"];

export const RPS_EMOJI: Record<RpsMove, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};
