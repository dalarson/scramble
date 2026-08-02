import type { PlayerDrinkStats } from "@/types/stats";
import type { TournamentSnapshot } from "@/types/live";

export function computePlayerDrinkStats(snapshot: TournamentSnapshot): PlayerDrinkStats[] {
  const playerMap = new Map<
    string,
    { name: string; teamName: string; photoUrl: string | null; beers: number; juice: number }
  >();

  for (const teamSummary of snapshot.teams) {
    for (const rosterEntry of teamSummary.players) {
      if (!playerMap.has(rosterEntry.playerId)) {
        playerMap.set(rosterEntry.playerId, {
          name: rosterEntry.playerName,
          teamName: teamSummary.team.name,
          photoUrl: rosterEntry.playerPhotoUrl,
          beers: 0,
          juice: 0,
        });
      }
    }

    for (const event of teamSummary.beerEvents) {
      const existing = playerMap.get(event.playerId);
      if (!existing) {
        continue;
      }
      if (event.type === "normal") {
        existing.beers += 1;
      } else {
        existing.juice += 1;
      }
    }
  }

  return Array.from(playerMap.entries())
    .map(([playerId, stats]) => ({
      playerId,
      playerName: stats.name,
      teamName: stats.teamName,
      playerPhotoUrl: stats.photoUrl,
      beers: stats.beers,
      birdieJuice: stats.juice,
      totalDrinks: stats.beers + stats.juice,
    }))
    .sort((a, b) => b.totalDrinks - a.totalDrinks);
}
