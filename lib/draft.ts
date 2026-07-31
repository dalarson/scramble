import type { DraftPickSummary, TeamPlayer } from "@/types";

export const MAX_TEAM_PLAYERS = 4;

export function generateSnakeOrder(
  teamIds: readonly string[],
  rounds: number,
): string[][] {
  if (teamIds.length < 2) {
    throw new Error("Snake draft requires at least two teams.");
  }
  if (rounds < 1) {
    throw new Error("Snake draft requires at least one round.");
  }

  return Array.from({ length: rounds }, (_, roundIndex) => {
    const isForwardRound = roundIndex % 2 === 0;
    return isForwardRound ? [...teamIds] : [...teamIds].reverse();
  });
}

export function getSnakePickSequence(
  teamIds: readonly string[],
  rounds: number,
): DraftPickSummary[] {
  let overallPick = 1;

  return generateSnakeOrder(teamIds, rounds).flatMap((round, roundIndex) =>
    round.map((teamId, pickIndex) => {
      const summary: DraftPickSummary = {
        teamId,
        round: roundIndex + 1,
        overallPick,
        pickInRound: pickIndex + 1,
      };
      overallPick += 1;
      return summary;
    }),
  );
}

export function getNextSnakePick(input: {
  teamIds: readonly string[];
  draftedPlayersByTeamId: Map<string, TeamPlayer[]>;
  maxPlayersPerTeam?: number;
}): DraftPickSummary | null {
  const maxPlayersPerTeam = input.maxPlayersPerTeam ?? MAX_TEAM_PLAYERS;
  const nonCaptainRounds = maxPlayersPerTeam - 1;
  const sequence = getSnakePickSequence(input.teamIds, nonCaptainRounds);
  const draftedPickCount = input.teamIds.reduce((total, teamId) => {
    const draftedPlayers = input.draftedPlayersByTeamId.get(teamId) ?? [];
    return total + Math.max(draftedPlayers.length - 1, 0);
  }, 0);

  return sequence[draftedPickCount] ?? null;
}

export function assignSnakeDraftSlots(input: {
  teamIds: readonly string[];
  playerIdsInPickOrder: readonly string[];
  playersPerTeam: number;
}): Map<string, string[]> {
  const rounds = input.playersPerTeam;
  const orderByRound = generateSnakeOrder(input.teamIds, rounds);
  const totalPicks = orderByRound.flat().length;

  if (input.playerIdsInPickOrder.length !== totalPicks) {
    throw new Error(
      `Expected ${totalPicks} drafted players, got ${input.playerIdsInPickOrder.length}.`,
    );
  }

  const uniquePlayerIds = new Set(input.playerIdsInPickOrder);
  if (uniquePlayerIds.size !== input.playerIdsInPickOrder.length) {
    throw new Error("A player was drafted more than once.");
  }

  const selections = new Map<string, string[]>(
    input.teamIds.map((teamId) => [teamId, []]),
  );

  let pickIndex = 0;
  for (const round of orderByRound) {
    for (const teamId of round) {
      const picks = selections.get(teamId);
      if (!picks) {
        throw new Error(`Unknown team id: ${teamId}`);
      }
      picks.push(input.playerIdsInPickOrder[pickIndex]);
      pickIndex += 1;
    }
  }

  return selections;
}
