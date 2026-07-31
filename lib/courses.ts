import type { Hole } from "@/types";

export function getNextHole(
  holes: readonly Hole[],
  currentHoleNumber: number,
): Hole | null {
  const sorted = [...holes].sort((left, right) => left.number - right.number);
  return sorted.find((hole) => hole.number > currentHoleNumber) ?? null;
}

export function getCurrentHole(
  holes: readonly Hole[],
  scoredHoleIds: readonly string[],
): Hole | null {
  const scoredIds = new Set(scoredHoleIds);
  const sorted = [...holes].sort((left, right) => left.number - right.number);
  return sorted.find((hole) => !scoredIds.has(hole.id)) ?? null;
}
