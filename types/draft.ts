import type { Player, Team, Tournament } from "./domain";
import type { TeamRosterEntry } from "./live";

export interface DraftPickSummary {
  teamId: string;
  round: number;
  overallPick: number;
  pickInRound: number;
}

export interface DraftTeamSummary {
  team: Team;
  captain: Player | null;
  players: TeamRosterEntry[];
}

export interface DraftSnapshot {
  tournament: Tournament;
  teams: DraftTeamSummary[];
  availablePlayers: Player[];
  nextPick: (DraftPickSummary & { teamName: string }) | null;
  maxPlayersPerTeam: number;
  isComplete: boolean;
}
