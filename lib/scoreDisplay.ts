export function formatToParScore(score: number): string {
  if (score === 0) {
    return "E";
  }

  return score > 0 ? `+${score}` : `${score}`;
}

export function formatThruLabel(holesPlayed: number): string {
  if (holesPlayed <= 0) {
    return "(Not started)";
  }

  return `(Thru ${holesPlayed})`;
}

export function formatGolfScoreWithToPar(
  golfScore: number,
  parPlayed: number,
): string {
  const diff = golfScore - parPlayed;
  return `${golfScore} (${formatToParScore(diff)})`;
}
