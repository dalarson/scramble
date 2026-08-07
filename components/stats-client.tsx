"use client";

import { useTournamentSnapshot } from "@/hooks/use-tournament-snapshot";
import { computePlayerDrinkStats } from "@/lib/stats";
import { formatToParScore } from "@/lib/scoreDisplay";
import type { PlayerDrinkStats } from "@/types/stats";

function PlayerDrinkLeaderboard(input: {
  rows: PlayerDrinkStats[];
  beerScoringMode: "gross" | "net";
  showBirdieJuice: boolean;
}) {
  const sorted = [...input.rows].sort((left, right) => {
    const leftBonus = input.beerScoringMode === "net" ? left.netBeerBonus : left.beers;
    const rightBonus = input.beerScoringMode === "net" ? right.netBeerBonus : right.beers;
    return (
      rightBonus - leftBonus ||
      right.beers - left.beers ||
      right.totalDrinks - left.totalDrinks
    );
  });
  const gridClass = input.showBirdieJuice
    ? "grid-cols-[28px_minmax(0,1fr)_40px_44px_44px_40px_44px]"
    : "grid-cols-[28px_minmax(0,1fr)_40px_44px_44px]";

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
      <div
        className={`grid ${gridClass} items-center gap-2 border-b border-zinc-200 px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700`}
      >
        <span>#</span>
        <span>Player</span>
        <span className="text-right">Hcp</span>
        <span className="text-right">Beers</span>
        <span className="text-right">Bonus</span>
        {input.showBirdieJuice ? <span className="text-right">Juice</span> : null}
        {input.showBirdieJuice ? <span className="text-right">Total</span> : null}
      </div>
      {sorted.length === 0 ? (
        <div className="px-3 py-4 text-center text-sm text-zinc-500">No data yet</div>
      ) : (
        sorted.map((row, idx) => (
          <div
            key={row.playerId}
            className={`grid ${gridClass} items-center gap-2 px-3 py-2 ${
              idx !== sorted.length - 1 ? "border-b border-zinc-200 dark:border-zinc-800" : ""
            }`}
          >
            <div className="text-xs font-semibold text-zinc-500">{idx + 1}</div>
            <div className="flex min-w-0 items-center gap-2">
              {row.playerPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.playerPhotoUrl}
                  alt={row.playerName}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold uppercase text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                  {row.playerName.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{row.playerName}</div>
                <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {row.teamName}
                </div>
              </div>
            </div>
            <div className="text-right text-sm font-semibold">{row.beerHandicap ?? "-"}</div>
            <div className="text-right text-sm font-semibold">{row.beers}</div>
            <div className="text-right text-sm font-semibold">
              {input.beerScoringMode === "net" ? row.netBeerBonus : row.beers}
            </div>
            {input.showBirdieJuice ? (
              <div className="text-right text-sm font-semibold">{row.birdieJuice}</div>
            ) : null}
            {input.showBirdieJuice ? (
              <div className="text-right text-sm font-semibold">{row.totalDrinks}</div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

function FinalStandingsTable({
  snapshot,
}: {
  snapshot: ReturnType<typeof useTournamentSnapshot>["snapshot"];
}) {
  if (!snapshot) {
    return null;
  }
  const { leaderboard } = snapshot;
  const showBirdieJuice = snapshot.tournament.birdieJuiceEnabled;
  const standingsGridClass = showBirdieJuice
    ? "grid-cols-[24px_minmax(0,1fr)_44px_36px_36px_36px_44px_36px]"
    : "grid-cols-[24px_minmax(0,1fr)_44px_36px_44px_36px_36px]";
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
      <div
        className={`grid ${standingsGridClass} items-center gap-1 border-b border-zinc-200 px-2 py-2 text-[9px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700`}
      >
        <span>#</span>
        <span>Team</span>
        <span className="text-right">Net</span>
        <span className="text-right">Gross</span>
        <span className="text-right">Beers</span>
        <span className="text-right">Birdies</span>
        {showBirdieJuice ? <span className="text-right">Juice</span> : null}
        <span className="text-right">Status</span>
      </div>
      {leaderboard.map((entry, idx) => (
        <div
          key={entry.teamId}
          className={`grid ${standingsGridClass} items-center gap-1 px-2 py-2 ${
            idx !== leaderboard.length - 1 ? "border-b border-zinc-200 dark:border-zinc-800" : ""
          } ${entry.status === "dq" ? "opacity-50" : ""}`}
        >
          <div className="text-xs font-semibold">{entry.status === "dq" ? "–" : idx + 1}</div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">{entry.teamName}</div>
          </div>
          <div className="text-right text-sm font-bold">{formatToParScore(entry.toParScore)}</div>
          <div className="text-right text-xs text-zinc-600 dark:text-zinc-400">
            {entry.grossScore}
          </div>
          <div className="text-right text-xs text-zinc-600 dark:text-zinc-400">
            {entry.beerBonus}
          </div>
          <div className="text-right text-xs text-zinc-600 dark:text-zinc-400">
            {entry.birdies}
          </div>
          {showBirdieJuice ? (
            <div className="text-right text-xs text-zinc-600 dark:text-zinc-400">
              {entry.birdieJuice}
            </div>
          ) : null}
          <div className="text-right text-[10px] font-semibold uppercase">
            {entry.status === "dq" ? (
              <span className="text-red-500">DQ</span>
            ) : (
              <span className="text-green-600">✓</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StatsClient(input: { initialTournamentId?: string }) {
  const { tournaments, selectedTournamentId, setSelectedTournamentId, snapshot, loading, error } =
    useTournamentSnapshot(input.initialTournamentId);

  const playerStats = snapshot ? computePlayerDrinkStats(snapshot) : [];
  const isComplete = snapshot?.tournament.status === "complete";
  const showBirdieJuice = snapshot?.tournament.birdieJuiceEnabled ?? false;

  return (
    <div className="flex h-[100dvh] flex-col gap-3 overflow-hidden p-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Player Stats</h1>
        <select
          className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={selectedTournamentId}
          onChange={(e) => setSelectedTournamentId(e.target.value)}
        >
          <option value="">Select tournament</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {loading && !snapshot ? (
        <p className="text-sm text-zinc-500">Loading stats…</p>
      ) : null}

      {snapshot ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {isComplete ? (
            <div className="shrink-0">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                🏆 Final Standings
              </p>
              <FinalStandingsTable snapshot={snapshot} />
            </div>
          ) : (
            <div className="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              Tournament is in progress — stats update live.
            </div>
          )}

          <div className="shrink-0">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Drinking Leaderboard
            </p>
            <PlayerDrinkLeaderboard
              beerScoringMode={snapshot.tournament.beerScoringMode}
              rows={playerStats}
              showBirdieJuice={showBirdieJuice}
            />
          </div>
        </div>
      ) : null}

      {!snapshot && !loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Select a tournament to view stats
        </div>
      ) : null}
    </div>
  );
}
