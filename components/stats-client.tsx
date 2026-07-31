"use client";

import { useState } from "react";
import { useTournamentSnapshot } from "@/hooks/use-tournament-snapshot";
import { computePlayerDrinkStats } from "@/lib/stats";
import { formatToParScore } from "@/lib/scoreDisplay";
import type { PlayerDrinkStats } from "@/types/stats";

type DrinkTab = "beers" | "juice" | "combined";

function DrinkTable({
  rows,
  valueKey,
  valueLabel,
}: {
  rows: PlayerDrinkStats[];
  valueKey: keyof Pick<PlayerDrinkStats, "beers" | "birdieJuice" | "totalDrinks">;
  valueLabel: string;
}) {
  const sorted = [...rows].sort((a, b) => b[valueKey] - a[valueKey]);
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
      <div className="grid grid-cols-[28px_1fr_56px] items-center gap-2 border-b border-zinc-200 px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
        <span>#</span>
        <span>Player</span>
        <span className="text-right">{valueLabel}</span>
      </div>
      {sorted.length === 0 ? (
        <div className="px-3 py-4 text-center text-sm text-zinc-500">No data yet</div>
      ) : (
        sorted.map((row, idx) => (
          <div
            key={row.playerId}
            className={`grid grid-cols-[28px_1fr_56px] items-center gap-2 px-3 py-2 ${
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
              <span className="truncate text-sm font-medium">{row.playerName}</span>
            </div>
            <div className="text-right text-lg font-semibold">{row[valueKey]}</div>
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
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
      <div className="grid grid-cols-[24px_minmax(0,1fr)_44px_36px_36px_36px_44px_36px] items-center gap-1 border-b border-zinc-200 px-2 py-2 text-[9px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
        <span>#</span>
        <span>Team</span>
        <span className="text-right">Net</span>
        <span className="text-right">Gross</span>
        <span className="text-right">Beers</span>
        <span className="text-right">Brdies</span>
        <span className="text-right">Juice</span>
        <span className="text-right">Status</span>
      </div>
      {leaderboard.map((entry, idx) => (
        <div
          key={entry.teamId}
          className={`grid grid-cols-[24px_minmax(0,1fr)_44px_36px_36px_36px_44px_36px] items-center gap-1 px-2 py-2 ${
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
          <div className="text-right text-xs text-zinc-600 dark:text-zinc-400">
            {entry.birdieJuice}
          </div>
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

  const [drinkTab, setDrinkTab] = useState<DrinkTab>("combined");

  const playerStats = snapshot ? computePlayerDrinkStats(snapshot) : [];
  const isComplete = snapshot?.tournament.status === "complete";

  const tabLabels: { key: DrinkTab; label: string; emoji: string }[] = [
    { key: "combined", label: "Total", emoji: "🍺" },
    { key: "beers", label: "Beers", emoji: "🍺" },
    { key: "juice", label: "Birdie Juice", emoji: "🔥" },
  ];

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
            <div className="mb-2 flex gap-1 rounded-2xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
              {tabLabels.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDrinkTab(key)}
                  className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-colors ${
                    drinkTab === key
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                      : "text-zinc-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {drinkTab === "beers" && (
              <DrinkTable rows={playerStats} valueKey="beers" valueLabel="Beers" />
            )}
            {drinkTab === "juice" && (
              <DrinkTable rows={playerStats} valueKey="birdieJuice" valueLabel="Birdie Juice" />
            )}
            {drinkTab === "combined" && (
              <DrinkTable rows={playerStats} valueKey="totalDrinks" valueLabel="Total" />
            )}
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
