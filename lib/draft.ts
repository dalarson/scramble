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
