export function requiresDisqualification(input: {
  tournamentComplete: boolean;
  birdieDebt: number;
}): boolean {
  return input.tournamentComplete && input.birdieDebt > 0;
}
