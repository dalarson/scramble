import type { TeamStats } from "@/types";
import { sortLeaderboard } from "./scoring";

export function calculateLeaderboard(stats: readonly TeamStats[]): TeamStats[] {
  return sortLeaderboard(stats);
}
