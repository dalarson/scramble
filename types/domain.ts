export type TournamentStatus = "draft" | "live" | "complete" | "archived";
export type TeamStatus = "active" | "dq";
export type BeerEventType = "normal" | "birdie_juice";
export type BeerScoringMode = "gross" | "net";

export interface Course {
  id: string;
  name: string;
  location: string | null;
  createdAt: string;
}

export interface TeeSet {
  id: string;
  courseId: string;
  name: string;
  courseRating: number;
  slopeRating: number;
  totalPar: number;
}

export interface Hole {
  id: string;
  teeSetId: string;
  number: number;
  par: number;
  yardage: number | null;
  handicap: number | null;
}

export interface Tournament {
  id: string;
  joinCode: string;
  name: string;
  date: string;
  courseId: string;
  teeSetId: string;
  birdieJuiceEnabled: boolean;
  beerScoringMode: BeerScoringMode;
  status: TournamentStatus;
  createdAt: string;
}

export interface Player {
  id: string;
  name: string;
  golfHandicap: number | null;
  beerHandicap: number | null;
  photoUrl: string | null;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  captainPlayerId: string | null;
  accessToken: string;
  draftOrder: number;
}

export interface TeamPlayer {
  teamId: string;
  playerId: string;
  draftPosition: number;
}

export interface HoleScore {
  id: string;
  teamId: string;
  holeId: string;
  strokes: number;
  createdAt: string;
}

export interface BeerEvent {
  id: string;
  teamId: string;
  playerId: string;
  holeId: string | null;
  type: BeerEventType;
  createdAt: string;
}

export interface TeamStats {
  teamId: string;
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
