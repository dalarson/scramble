import { getCurrentHole } from "@/lib/courses";
import { calculateTeamStats } from "@/lib/scoring";
import type {
  BeerEvent,
  Hole,
  HoleScore,
  LeaderboardEntry,
  LiveTeamSummary,
  Player,
  Team,
  TeamRosterEntry,
  Tournament,
} from "@/types";

function buildLeaderboardEntries(teams: readonly LiveTeamSummary[]): LeaderboardEntry[] {
  return teams
    .map((teamSummary) => ({
      teamId: teamSummary.team.id,
      teamName: teamSummary.team.name,
      holeNumber: teamSummary.currentHole?.number ?? null,
      holesPlayed: teamSummary.holesPlayed,
      grossScore: teamSummary.grossScore,
      netScore: teamSummary.netScore,
      toParScore: teamSummary.toParScore,
      beerBonus: teamSummary.beerBonus,
      birdies: teamSummary.birdies,
      birdieJuice: teamSummary.birdieJuice,
      birdieDebt: teamSummary.birdieDebt,
      status: teamSummary.status,
    }))
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "active" ? -1 : 1;
      }
      return left.toParScore - right.toParScore;
    });
}

export function buildTournamentSnapshot(input: {
  tournament: Tournament;
  holes: Hole[];
  teams: Team[];
  playersById: Map<string, Player>;
  rostersByTeamId: Map<string, TeamRosterEntry[]>;
  scoresByTeamId: Map<string, HoleScore[]>;
  eventsByTeamId: Map<string, BeerEvent[]>;
}) {
  const holesById = new Map(input.holes.map((hole) => [hole.id, hole]));

  const teams = input.teams.map((team) => {
    const scores = input.scoresByTeamId.get(team.id) ?? [];
    const beerEvents = input.eventsByTeamId.get(team.id) ?? [];
    const roster = input.rostersByTeamId.get(team.id) ?? [];
    const playerBeerHandicaps = new Map(roster.map((entry) => [entry.playerId, entry.beerHandicap]));
    const currentHole = getCurrentHole(
      input.holes,
      scores.map((score) => score.holeId),
    );
    const stats = calculateTeamStats({
      teamId: team.id,
      tournamentComplete: input.tournament.status === "complete",
      birdieJuiceEnabled: input.tournament.birdieJuiceEnabled,
      beerScoringMode: input.tournament.beerScoringMode,
      playerBeerHandicaps,
      holeScores: scores
        .map((score) => {
          const hole = holesById.get(score.holeId);
          if (!hole) {
            return null;
          }
          return { score, par: hole.par };
        })
        .filter((value): value is { score: HoleScore; par: number } => value !== null),
      beerEvents,
    });

    return {
      team,
      captain: team.captainPlayerId
        ? (input.playersById.get(team.captainPlayerId) ?? null)
        : null,
      players: roster,
      currentHole,
      scores,
      beerEvents,
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
    } satisfies LiveTeamSummary;
  });

  return {
    tournament: input.tournament,
    holes: [...input.holes].sort((left, right) => left.number - right.number),
    teams,
    leaderboard: buildLeaderboardEntries(teams),
  };
}
