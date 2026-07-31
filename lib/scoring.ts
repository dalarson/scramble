import type { BeerEvent, HoleScore, TeamStats } from "@/types";

export interface HoleScoreWithPar {
  score: HoleScore;
  par: number;
}

export function calculateGrossScore(scores: readonly HoleScore[]): number {
  return scores.reduce((total, score) => total + score.strokes, 0);
}

export function calculateParPlayed(
  holeScores: readonly HoleScoreWithPar[],
): number {
  return holeScores.reduce((total, holeScore) => total + holeScore.par, 0);
}

export function calculateBeerBonus(events: readonly BeerEvent[]): number {
  return events.filter((event) => event.type === "normal").length;
}

export function calculateBirdies(
  holeScores: readonly HoleScoreWithPar[],
): number {
  return holeScores.filter(({ score, par }) => score.strokes < par).length;
}

export function calculateBirdieJuice(events: readonly BeerEvent[]): number {
  return events.filter((event) => event.type === "birdie_juice").length;
}

export function calculateBirdieDebt(
  birdies: number,
  birdieJuiceConsumed: number,
): number {
  return Math.max(0, birdies - birdieJuiceConsumed);
}

export function calculateNetScore(
  grossScore: number,
  beerBonus: number,
): number {
  return grossScore - beerBonus;
}

export function calculateToParScore(
  grossScore: number,
  parPlayed: number,
  beerBonus: number,
): number {
  return grossScore - parPlayed - beerBonus;
}

export function calculateTeamStats(input: {
  teamId: string;
  holeScores: readonly HoleScoreWithPar[];
  beerEvents: readonly BeerEvent[];
  tournamentComplete: boolean;
}): TeamStats {
  const grossScore = calculateGrossScore(input.holeScores.map(({ score }) => score));
  const holesPlayed = input.holeScores.length;
  const parPlayed = calculateParPlayed(input.holeScores);
  const beerBonus = calculateBeerBonus(input.beerEvents);
  const birdies = calculateBirdies(input.holeScores);
  const birdieJuice = calculateBirdieJuice(input.beerEvents);
  const birdieDebt = calculateBirdieDebt(birdies, birdieJuice);
  const netScore = calculateNetScore(grossScore, beerBonus);
  const toParScore = calculateToParScore(grossScore, parPlayed, beerBonus);

  return {
    teamId: input.teamId,
    holesPlayed,
    parPlayed,
    grossScore,
    beerBonus,
    birdies,
    birdieJuice,
    birdieDebt,
    netScore,
    toParScore,
    status: input.tournamentComplete && birdieDebt > 0 ? "dq" : "active",
  };
}

export function sortLeaderboard(stats: readonly TeamStats[]): TeamStats[] {
  const active = stats
    .filter((team) => team.status === "active")
    .sort((left, right) => left.toParScore - right.toParScore);
  const dq = stats.filter((team) => team.status === "dq");
  return [...active, ...dq];
}
