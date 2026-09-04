"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatThruLabel, formatToParScore } from "@/lib/scoreDisplay";
import { computePlayerDrinkStats } from "@/lib/stats";
import { useTournamentSnapshot } from "@/hooks/use-tournament-snapshot";

export default function LeaderboardClient(input: {
  initialTournamentId?: string;
  highlightTeamId?: string;
  hideTournamentSelector?: boolean;
  liveHref?: string;
}) {
  const {
    tournaments,
    selectedTournamentId,
    setSelectedTournamentId,
    snapshot,
    loading,
    error,
  } = useTournamentSnapshot(input.initialTournamentId);
  const [teamPageTab, setTeamPageTab] = useState<"leaderboard" | "players">("leaderboard");

  const isComplete = snapshot?.tournament.status === "complete";
  const playerStats = useMemo(
    () => (snapshot ? computePlayerDrinkStats(snapshot) : []),
    [snapshot],
  );
  const showBirdieJuice = snapshot?.tournament.birdieJuiceEnabled ?? false;
  const showTeamTabs = Boolean(input.liveHref);

  return (
    <div className="flex min-h-[calc(100dvh-1rem)] flex-col gap-2 overflow-hidden pb-18">
      {!input.hideTournamentSelector ? (
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Tournament</span>
          <select
            className="rounded-full border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={selectedTournamentId}
            onChange={(event) => setSelectedTournamentId(event.target.value)}
          >
            <option value="">Select tournament</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {loading && !snapshot ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Loading leaderboard...</p>
      ) : null}

      {showTeamTabs ? (
        <div className="grid grid-cols-2 rounded-full border border-zinc-200 bg-white p-1 text-xs font-semibold shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
          <button
            className={`rounded-full px-3 py-2 ${teamPageTab === "leaderboard" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : ""}`}
            onClick={() => setTeamPageTab("leaderboard")}
          >
            Leaderboard
          </button>
          <button
            className={`rounded-full px-3 py-2 ${teamPageTab === "players" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : ""}`}
            onClick={() => setTeamPageTab("players")}
          >
            Player Stats
          </button>
        </div>
      ) : null}

      {snapshot ? (
        showTeamTabs && teamPageTab === "players" ? (
          <PlayerStatsTab
            beerScoringMode={snapshot.tournament.beerScoringMode}
            showBirdieJuice={showBirdieJuice}
            stats={playerStats}
          />
        ) : isComplete ? (
          <FinalStandingsView snapshot={snapshot} highlightTeamId={input.highlightTeamId} />
        ) : (
          <LiveLeaderboardView snapshot={snapshot} highlightTeamId={input.highlightTeamId} />
        )
      ) : null}

      {input.liveHref ? (
        <div className="fixed inset-x-4 bottom-4 z-10 mx-auto max-w-md">
          <div className="grid grid-cols-2 gap-2 rounded-full border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
            <Link
              className="rounded-full border border-zinc-200 px-3 py-2.5 text-center text-sm font-medium shadow-sm dark:border-zinc-700"
              href={input.liveHref}
            >
              Team Live
            </Link>
            <div className="rounded-full bg-zinc-900 px-3 py-2.5 text-center text-sm font-medium text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900">
              Leaderboard
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlayerStatsTab(input: {
  stats: ReturnType<typeof computePlayerDrinkStats>;
  showBirdieJuice: boolean;
  beerScoringMode: "gross" | "net";
}) {
  const sortedStats = [...input.stats].sort((left, right) => {
    const leftBonus =
      input.beerScoringMode === "net" ? left.netBeerBonus : left.beers;
    const rightBonus =
      input.beerScoringMode === "net" ? right.netBeerBonus : right.beers;
    return (
      rightBonus - leftBonus ||
      right.beers - left.beers ||
      right.totalDrinks - left.totalDrinks
    );
  });
  const gridClass = input.showBirdieJuice
    ? "grid-cols-[26px_minmax(0,1fr)_38px_40px_44px_40px_40px]"
    : "grid-cols-[26px_minmax(0,1fr)_38px_44px_44px]";

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
      <div
        className={`hidden ${gridClass} items-center gap-1 border-b border-zinc-200 px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-500 sm:grid dark:border-zinc-700`}
      >
        <span>#</span>
        <span>Player</span>
        <span className="text-right">Hcp</span>
        <span className="text-right">Beers</span>
        <span className="text-right">Bonus</span>
        {input.showBirdieJuice ? <span className="text-right">Juice</span> : null}
        {input.showBirdieJuice ? <span className="text-right">Total</span> : null}
      </div>
      {sortedStats.length === 0 ? (
        <div className="p-4 text-sm text-zinc-500">No player stats yet.</div>
      ) : (
        sortedStats.map((player, index) => (
          <div
            key={player.playerId}
            className={`px-3 py-3 sm:grid sm:items-center sm:gap-1 sm:py-2 ${gridClass} ${
              index !== sortedStats.length - 1 ? "border-b border-zinc-200 dark:border-zinc-800" : ""
            }`}
          >
            <div className="flex items-center gap-3 sm:hidden">
              <span className="w-5 shrink-0 text-center text-sm font-semibold text-zinc-500">
                {index + 1}
              </span>
              <PlayerAvatar name={player.playerName} photoUrl={player.playerPhotoUrl} />
              <div className="min-w-0 flex-1">
                <div className="break-words text-base font-medium leading-tight">
                  {player.playerName}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {player.teamName}
                </div>
              </div>
            </div>

            <div
              className={`mt-3 grid ${input.showBirdieJuice ? "grid-cols-5" : "grid-cols-3"} gap-1 rounded-2xl bg-zinc-100 px-2 py-2 text-center sm:hidden dark:bg-zinc-900`}
            >
              <PlayerStat label="HCP" value={player.beerHandicap ?? "-"} />
              <PlayerStat label="Beers" value={player.beers} />
              <PlayerStat
                label="Bonus"
                value={input.beerScoringMode === "net" ? player.netBeerBonus : player.beers}
              />
              {input.showBirdieJuice ? (
                <PlayerStat label="Juice" value={player.birdieJuice} />
              ) : null}
              {input.showBirdieJuice ? (
                <PlayerStat label="Total" value={player.totalDrinks} />
              ) : null}
            </div>

            <span className="hidden text-xs font-semibold sm:block">{index + 1}</span>
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <PlayerAvatar name={player.playerName} photoUrl={player.playerPhotoUrl} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{player.playerName}</div>
                <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {player.teamName}
                </div>
              </div>
            </div>
            <span className="hidden text-right text-sm font-semibold sm:block">
              {player.beerHandicap ?? "-"}
            </span>
            <span className="hidden text-right text-sm font-semibold sm:block">
              {player.beers}
            </span>
            <span className="hidden text-right text-sm font-semibold sm:block">
              {input.beerScoringMode === "net" ? player.netBeerBonus : player.beers}
            </span>
            {input.showBirdieJuice ? (
              <span className="hidden text-right text-sm font-semibold sm:block">
                {player.birdieJuice}
              </span>
            ) : null}
            {input.showBirdieJuice ? (
              <span className="hidden text-right text-sm font-semibold sm:block">
                {player.totalDrinks}
              </span>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

function PlayerStat(input: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
        {input.label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{input.value}</div>
    </div>
  );
}

function PlayerAvatar(input: { name: string; photoUrl: string | null }) {
  if (input.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={input.name} className="h-7 w-7 rounded-full object-cover" src={input.photoUrl} />
    );
  }

  const initials = input.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
      {initials}
    </div>
  );
}

function LiveLeaderboardView({
  snapshot,
  highlightTeamId,
}: {
  snapshot: NonNullable<ReturnType<typeof useTournamentSnapshot>["snapshot"]>;
  highlightTeamId?: string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
      <div className="grid grid-cols-[28px_minmax(0,1fr)_68px_64px] items-center gap-2 border-b border-zinc-200 px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
        <span>#</span>
        <span>Team</span>
        <span className="text-right">Score</span>
        <span className="text-right">Status</span>
      </div>
      <div className="grid auto-rows-fr">
        {snapshot.leaderboard.map((entry, index) => {
          const isHighlighted = entry.teamId === highlightTeamId;
          return (
            <div
              key={entry.teamId}
              className={`grid grid-cols-[28px_minmax(0,1fr)_68px_64px] items-center gap-2 px-3 py-2 ${
                index !== snapshot.leaderboard.length - 1
                  ? "border-b border-zinc-200 dark:border-zinc-800"
                  : ""
              } ${
                isHighlighted
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : ""
              }`}
            >
              <div className="text-xs font-semibold">{index + 1}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{entry.teamName}</div>
                <div className="truncate text-[11px] opacity-75">
                  {formatThruLabel(entry.holesPlayed)} · Beers {entry.beerBonus}
                  {snapshot.tournament.birdieJuiceEnabled
                    ? ` · Debt ${entry.birdieDebt}`
                    : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  {formatToParScore(entry.toParScore)}
                </div>
                <div className="text-[10px] opacity-70">
                  {entry.holeNumber ? `H${entry.holeNumber}` : "Done"}
                </div>
              </div>
              <div className="text-right text-[10px] uppercase opacity-80">
                {entry.status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinalStandingsView({
  snapshot,
  highlightTeamId,
}: {
  snapshot: NonNullable<ReturnType<typeof useTournamentSnapshot>["snapshot"]>;
  highlightTeamId?: string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
        <span className="text-sm font-bold tracking-tight">🏆 Final Standings</span>
      </div>
      <div className="grid grid-cols-[22px_minmax(0,1fr)_48px_36px_36px_40px] items-center gap-1 border-b border-zinc-200 px-3 py-1.5 text-[9px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
        <span>#</span>
        <span>Team</span>
        <span className="text-right">Net</span>
        <span className="text-right">Gross</span>
        <span className="text-right">🍺</span>
        <span className="text-right">Status</span>
      </div>
      <div>
        {snapshot.leaderboard.map((entry, index) => {
          const isHighlighted = entry.teamId === highlightTeamId;
          const isDq = entry.status === "dq";
          return (
            <div
              key={entry.teamId}
              className={`grid grid-cols-[22px_minmax(0,1fr)_48px_36px_36px_40px] items-center gap-1 px-3 py-2 ${
                index !== snapshot.leaderboard.length - 1
                  ? "border-b border-zinc-200 dark:border-zinc-800"
                  : ""
              } ${isHighlighted ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : ""} ${isDq ? "opacity-50" : ""}`}
            >
              <div className="text-xs font-semibold">{isDq ? "–" : index + 1}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{entry.teamName}</div>
                <div className="truncate text-[10px] opacity-70">
                  {entry.birdies} birdies
                  {snapshot.tournament.birdieJuiceEnabled
                    ? ` · ${entry.birdieJuice} juice`
                    : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold">{formatToParScore(entry.toParScore)}</div>
              </div>
              <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                {entry.grossScore}
              </div>
              <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                {entry.beerBonus}
              </div>
              <div className="text-right text-[10px] font-bold uppercase">
                {isDq ? (
                  <span className="text-red-500">DQ</span>
                ) : (
                  <span className="text-green-600">✓</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
