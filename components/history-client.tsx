"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listTournaments } from "@/services/tournamentSetup";
import type { Tournament } from "@/types";

const STATUS_BADGE: Record<
  Tournament["status"],
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  live: { label: "🟢 Live", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  complete: { label: "🏆 Final", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  archived: { label: "Archived", className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500" },
};

export default function HistoryClient() {
  const { data: tournaments, isLoading, error } = useQuery({
    queryKey: ["tournaments"],
    queryFn: listTournaments,
    staleTime: 60_000,
  });

  const sorted = [...(tournaments ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden p-4 gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Tournament History</h1>
        <Link
          href="/tournament"
          className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-700"
        >
          Setup
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading tournaments…</p>
      ) : null}

      {error instanceof Error ? (
        <p className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-800">{error.message}</p>
      ) : null}

      {sorted.length === 0 && !isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          No tournaments yet
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {sorted.map((tournament) => {
            const badge = STATUS_BADGE[tournament.status];
            const isViewable = tournament.status === "complete" || tournament.status === "archived" || tournament.status === "live";
            const dateLabel = new Date(tournament.date + "T12:00:00").toLocaleDateString(
              undefined,
              { month: "short", day: "numeric", year: "numeric" },
            );
            return (
              <div
                key={tournament.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">{tournament.name}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">{dateLabel}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                {isViewable ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      href={`/tournament/${tournament.id}/leaderboard`}
                      className="rounded-xl border border-zinc-200 py-2 text-center text-xs font-medium dark:border-zinc-700"
                    >
                      Leaderboard
                    </Link>
                    <Link
                      href={`/stats?tournament=${tournament.id}`}
                      className="rounded-xl border border-zinc-200 py-2 text-center text-xs font-medium dark:border-zinc-700"
                    >
                      Player Stats
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
