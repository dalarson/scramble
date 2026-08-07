import type { BeerEvent, BeerScoringMode, HoleScore, TeamStats } from "@/types";

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

function normalizeBeerHandicap(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.ceil(value));
}

export function calculateBeerBonus(input: {
  events: readonly BeerEvent[];
  beerScoringMode: BeerScoringMode;
  playerBeerHandicaps: ReadonlyMap<string, number | null>;
}): number {
  const normalBeerEvents = input.events.filter((event) => event.type === "normal");
  if (input.beerScoringMode === "gross") {
    return normalBeerEvents.length;
  }

  const beersByPlayer = new Map<string, number>();
  for (const event of normalBeerEvents) {
    beersByPlayer.set(event.playerId, (beersByPlayer.get(event.playerId) ?? 0) + 1);
  }

  let bonus = 0;
  for (const [playerId, beers] of beersByPlayer.entries()) {
    const handicap = normalizeBeerHandicap(input.playerBeerHandicaps.get(playerId));
    bonus += Math.max(0, beers - handicap);
  }
  return bonus;
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
  playerBeerHandicaps: ReadonlyMap<string, number | null>;
  beerScoringMode: BeerScoringMode;
  birdieJuiceEnabled: boolean;
  tournamentComplete: boolean;
}): TeamStats {
  const grossScore = calculateGrossScore(input.holeScores.map(({ score }) => score));
  const holesPlayed = input.holeScores.length;
  const parPlayed = calculateParPlayed(input.holeScores);
  const beerBonus = calculateBeerBonus({
    events: input.beerEvents,
    beerScoringMode: input.beerScoringMode,
    playerBeerHandicaps: input.playerBeerHandicaps,
  });
  const birdies = calculateBirdies(input.holeScores);
  const birdieJuice = input.birdieJuiceEnabled ? calculateBirdieJuice(input.beerEvents) : 0;
  const birdieDebt = input.birdieJuiceEnabled
    ? calculateBirdieDebt(birdies, birdieJuice)
    : 0;
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
