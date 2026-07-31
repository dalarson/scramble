"use client";

import Link from "next/link";
import { formatThruLabel, formatToParScore } from "@/lib/scoreDisplay";
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

      {snapshot ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
          <div className="grid grid-cols-[28px_minmax(0,1fr)_68px_64px] items-center gap-2 border-b border-zinc-200 px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
            <span>#</span>
            <span>Team</span>
            <span className="text-right">Score</span>
            <span className="text-right">Status</span>
          </div>
          <div className="grid auto-rows-fr">
            {snapshot.leaderboard.map((entry, index) => {
              const isHighlighted = entry.teamId === input.highlightTeamId;
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
                      {formatThruLabel(entry.holesPlayed)} · Beers {entry.beerBonus} · Debt{" "}
                      {entry.birdieDebt}
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
