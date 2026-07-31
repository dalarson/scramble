import type { BeerEvent, Hole, HoleScore, Player, Team, TeamStatus, Tournament } from "./domain";

export interface TeamRosterEntry {
  teamId: string;
  playerId: string;
  playerName: string;
  playerPhotoUrl: string | null;
  draftPosition: number;
}

export interface LiveTeamSummary {
  team: Team;
  captain: Player | null;
  players: TeamRosterEntry[];
  currentHole: Hole | null;
  scores: HoleScore[];
  beerEvents: BeerEvent[];
  holesPlayed: number;
  parPlayed: number;
  grossScore: number;
  beerBonus: number;
  birdies: number;
  birdieJuice: number;
  birdieDebt: number;
  netScore: number;
  toParScore: number;
  status: TeamStatus;
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  holeNumber: number | null;
  holesPlayed: number;
  grossScore: number;
  netScore: number;
  toParScore: number;
  beerBonus: number;
  birdies: number;
  birdieJuice: number;
  birdieDebt: number;
  status: TeamStatus;
}

export interface TournamentSnapshot {
  tournament: Tournament;
  holes: Hole[];
  teams: LiveTeamSummary[];
  leaderboard: LeaderboardEntry[];
}
