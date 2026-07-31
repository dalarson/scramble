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
