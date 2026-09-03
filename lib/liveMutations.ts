import { getCurrentHole } from "@/lib/courses";
import { buildLeaderboardEntries } from "@/lib/liveTournament";
import { calculateTeamStats } from "@/lib/scoring";
import type {
  BeerEvent,
  BeerEventType,
  HoleScore,
  TournamentSnapshot,
} from "@/types";

function timestampValue(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export type LiveMutationStatus = "queued" | "saving" | "failed";

type LiveMutationBase = {
  operationId: string;
  tournamentId: string;
  teamId: string;
  enteredAt: string;
  status: LiveMutationStatus;
  attempts: number;
  nextAttemptAt: number;
  error: string | null;
};

export type ScoreMutation = LiveMutationBase & {
  kind: "score";
  holeId: string;
  strokes: number;
};

export type DrinkMutation = LiveMutationBase & {
  kind: "drink";
  playerId: string;
  holeId: string | null;
  drinkType: BeerEventType;
};

export type UndoDrinkMutation = LiveMutationBase & {
  kind: "undo-drink";
  eventId: string;
  eventOperationId: string;
  drinkType: BeerEventType;
};

export type LiveMutation =
  | ScoreMutation
  | DrinkMutation
  | UndoDrinkMutation;

function recalculateTeam(
  snapshot: TournamentSnapshot,
  teamId: string,
  scores: HoleScore[],
  beerEvents: BeerEvent[],
) {
  const team = snapshot.teams.find((entry) => entry.team.id === teamId);
  if (!team) {
    return null;
  }

  const holesById = new Map(snapshot.holes.map((hole) => [hole.id, hole]));
  const playerBeerHandicaps = new Map(
    team.players.map((player) => [player.playerId, player.beerHandicap]),
  );
  const stats = calculateTeamStats({
    teamId,
    tournamentComplete: snapshot.tournament.status === "complete",
    birdieJuiceEnabled: snapshot.tournament.birdieJuiceEnabled,
    beerScoringMode: snapshot.tournament.beerScoringMode,
    playerBeerHandicaps,
    holeScores: scores.flatMap((score) => {
      const hole = holesById.get(score.holeId);
      return hole ? [{ score, par: hole.par }] : [];
    }),
    beerEvents,
  });

  return {
    ...team,
    scores,
    beerEvents,
    currentHole: getCurrentHole(
      snapshot.holes,
      scores.map((score) => score.holeId),
    ),
    holesPlayed: stats.holesPlayed,
    parPlayed: stats.parPlayed,
    grossScore: stats.grossScore,
    beerBonus: stats.beerBonus,
    birdies: stats.birdies,
    birdieJuice: stats.birdieJuice,
    birdieDebt: stats.birdieDebt,
    netScore: stats.netScore,
    toParScore: stats.toParScore,
    status: stats.status,
  };
}

export function applyLiveMutations(
  snapshot: TournamentSnapshot | null,
  mutations: readonly LiveMutation[],
): TournamentSnapshot | null {
  if (!snapshot || mutations.length === 0) {
    return snapshot;
  }

  const relevant = mutations
    .filter((mutation) => mutation.tournamentId === snapshot.tournament.id)
    .sort(
      (left, right) =>
        timestampValue(left.enteredAt) - timestampValue(right.enteredAt),
    );
  if (relevant.length === 0) {
    return snapshot;
  }

  const teams = snapshot.teams.map((team) => {
    const teamMutations = relevant.filter(
      (mutation) => mutation.teamId === team.team.id,
    );
    if (teamMutations.length === 0) {
      return team;
    }

    const scores = [...team.scores];
    let beerEvents = [...team.beerEvents];

    for (const mutation of teamMutations) {
      if (mutation.kind === "score") {
        const existingIndex = scores.findIndex(
          (score) => score.holeId === mutation.holeId,
        );
        const optimisticScore: HoleScore = {
          id: `optimistic:${mutation.operationId}`,
          teamId: mutation.teamId,
          holeId: mutation.holeId,
          strokes: mutation.strokes,
          operationId: mutation.operationId,
          enteredAt: mutation.enteredAt,
          updatedAt: mutation.enteredAt,
          createdAt: mutation.enteredAt,
        };
        if (existingIndex === -1) {
          scores.push(optimisticScore);
        } else if (
          timestampValue(mutation.enteredAt) >=
          timestampValue(scores[existingIndex].enteredAt)
        ) {
          scores[existingIndex] = optimisticScore;
        }
      } else if (mutation.kind === "drink") {
        if (
          !beerEvents.some(
            (event) => event.operationId === mutation.operationId,
          )
        ) {
          beerEvents.push({
            id: `optimistic:${mutation.operationId}`,
            teamId: mutation.teamId,
            playerId: mutation.playerId,
            holeId: mutation.holeId,
            type: mutation.drinkType,
            operationId: mutation.operationId,
            createdAt: mutation.enteredAt,
          });
        }
      } else if (mutation.status !== "failed") {
        beerEvents = beerEvents.filter(
          (event) =>
            event.id !== mutation.eventId &&
            event.operationId !== mutation.eventOperationId,
        );
      }
    }

    return recalculateTeam(
      snapshot,
      team.team.id,
      scores,
      beerEvents,
    ) ?? team;
  });

  return {
    ...snapshot,
    teams,
    leaderboard: buildLeaderboardEntries(teams),
  };
}

export function mergeConfirmedScore(
  snapshot: TournamentSnapshot | undefined,
  score: HoleScore,
) {
  if (!snapshot) {
    return snapshot;
  }
  const team = snapshot.teams.find((entry) => entry.team.id === score.teamId);
  if (!team) {
    return snapshot;
  }
  const existingScore = team.scores.find(
    (existing) => existing.holeId === score.holeId,
  );
  if (
    existingScore &&
    timestampValue(existingScore.enteredAt) > timestampValue(score.enteredAt)
  ) {
    return snapshot;
  }
  const scores = team.scores.filter(
    (existing) => existing.holeId !== score.holeId,
  );
  scores.push(score);
  const updatedTeam = recalculateTeam(
    snapshot,
    score.teamId,
    scores,
    team.beerEvents,
  );
  if (!updatedTeam) {
    return snapshot;
  }
  const teams = snapshot.teams.map((entry) =>
    entry.team.id === score.teamId ? updatedTeam : entry,
  );
  return { ...snapshot, teams, leaderboard: buildLeaderboardEntries(teams) };
}

export function mergeConfirmedDrink(
  snapshot: TournamentSnapshot | undefined,
  event: BeerEvent,
) {
  if (!snapshot) {
    return snapshot;
  }
  const team = snapshot.teams.find((entry) => entry.team.id === event.teamId);
  if (!team) {
    return snapshot;
  }
  const beerEvents = team.beerEvents.filter(
    (existing) => existing.operationId !== event.operationId,
  );
  beerEvents.push(event);
  const updatedTeam = recalculateTeam(
    snapshot,
    event.teamId,
    team.scores,
    beerEvents,
  );
  if (!updatedTeam) {
    return snapshot;
  }
  const teams = snapshot.teams.map((entry) =>
    entry.team.id === event.teamId ? updatedTeam : entry,
  );
  return { ...snapshot, teams, leaderboard: buildLeaderboardEntries(teams) };
}

export function removeConfirmedDrink(
  snapshot: TournamentSnapshot | undefined,
  teamId: string,
  eventId: string,
  eventOperationId: string,
) {
  if (!snapshot) {
    return snapshot;
  }
  const team = snapshot.teams.find((entry) => entry.team.id === teamId);
  if (!team) {
    return snapshot;
  }
  const updatedTeam = recalculateTeam(
    snapshot,
    teamId,
    team.scores,
    team.beerEvents.filter(
      (event) =>
        event.id !== eventId && event.operationId !== eventOperationId,
    ),
  );
  if (!updatedTeam) {
    return snapshot;
  }
  const teams = snapshot.teams.map((entry) =>
    entry.team.id === teamId ? updatedTeam : entry,
  );
  return { ...snapshot, teams, leaderboard: buildLeaderboardEntries(teams) };
}
