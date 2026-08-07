"use client";

import { useMemo } from "react";
import { formatGolfScoreWithToPar, formatToParScore } from "@/lib/scoreDisplay";
import { computePlayerDrinkStats } from "@/lib/stats";
import { useTournamentSnapshot } from "@/hooks/use-tournament-snapshot";

export default function TournamentReviewClient(input: {
  tournamentId: string;
}) {
  const { snapshot, loading, error } = useTournamentSnapshot(input.tournamentId);
  const playerStats = useMemo(
    () => (snapshot ? computePlayerDrinkStats(snapshot) : []),
    [snapshot],
  );

  if (loading && !snapshot) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-300">Loading review...</p>;
  }

  if (error) {
    return <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>;
  }

  if (!snapshot) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5">
      <section className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold tracking-tight">Tournament Review</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          {snapshot.tournament.name}
        </p>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Final totals</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {snapshot.leaderboard.map((entry, index) => {
            const team = snapshot.teams.find((teamSummary) => teamSummary.team.id === entry.teamId);
            return (
              <div
                key={entry.teamId}
                className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {entry.status === "dq" ? "DQ" : `#${index + 1}`} · {entry.teamName}
                  </div>
                  <div className="text-lg font-bold">{formatToParScore(entry.toParScore)}</div>
                </div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Golf{" "}
                  {team
                    ? formatGolfScoreWithToPar(team.grossScore, team.parPlayed)
                    : entry.grossScore}{" "}
                  · Beer bonus -{entry.beerBonus}
                  {snapshot.tournament.birdieJuiceEnabled
                    ? ` · Birdie debt ${entry.birdieDebt}`
                    : ""}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Team scorecards</h2>
        <div className="mt-3 grid gap-4">
          {snapshot.teams.map((teamSummary) => (
            <GolfScorecard
              key={teamSummary.team.id}
              holes={snapshot.holes}
              teamSummary={teamSummary}
            />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Player stats</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <div
            className={`grid ${snapshot.tournament.birdieJuiceEnabled ? "grid-cols-[1fr_64px_64px_64px]" : "grid-cols-[1fr_64px_64px]"} border-b border-zinc-200 px-3 py-2 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400`}
          >
            <span>Player</span>
            <span className="text-right">Beers</span>
            {snapshot.tournament.birdieJuiceEnabled ? (
              <span className="text-right">Juice</span>
            ) : null}
            <span className="text-right">Total</span>
          </div>
          {playerStats.map((player) => (
            <div
              key={player.playerId}
              className={`grid ${snapshot.tournament.birdieJuiceEnabled ? "grid-cols-[1fr_64px_64px_64px]" : "grid-cols-[1fr_64px_64px]"} border-b border-zinc-200 px-3 py-2 text-sm last:border-b-0 dark:border-zinc-700`}
            >
              <span>{player.playerName}</span>
              <span className="text-right">{player.beers}</span>
              {snapshot.tournament.birdieJuiceEnabled ? (
                <span className="text-right">{player.birdieJuice}</span>
              ) : null}
              <span className="text-right font-semibold">{player.totalDrinks}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function GolfScorecard(input: {
  holes: NonNullable<ReturnType<typeof useTournamentSnapshot>["snapshot"]>["holes"];
  teamSummary: NonNullable<ReturnType<typeof useTournamentSnapshot>["snapshot"]>["teams"][number];
}) {
  const scoresByHoleId = new Map(
    input.teamSummary.scores.map((score) => [score.holeId, score.strokes]),
  );
  const front = input.holes.slice(0, 9);
  const back = input.holes.slice(9, 18);

  const frontPar = front.reduce((sum, hole) => sum + hole.par, 0);
  const backPar = back.reduce((sum, hole) => sum + hole.par, 0);
  const frontScore = front.reduce((sum, hole) => sum + (scoresByHoleId.get(hole.id) ?? 0), 0);
  const backScore = back.reduce((sum, hole) => sum + (scoresByHoleId.get(hole.id) ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center justify-between bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
        <div className="font-semibold">{input.teamSummary.team.name}</div>
        <div className="text-sm">
          Golf{" "}
          {formatGolfScoreWithToPar(input.teamSummary.grossScore, input.teamSummary.parPlayed)}{" "}
          · Team {formatToParScore(input.teamSummary.toParScore)}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              <th className="px-2 py-2 text-left">Hole</th>
              {input.holes.map((hole) => (
                <th key={hole.id} className="px-2 py-2 text-center">
                  {hole.number}
                </th>
              ))}
              <th className="px-2 py-2 text-center">Out</th>
              <th className="px-2 py-2 text-center">In</th>
              <th className="px-2 py-2 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <td className="px-2 py-2 font-medium">Par</td>
              {input.holes.map((hole) => (
                <td key={hole.id} className="px-2 py-2 text-center">
                  {hole.par}
                </td>
              ))}
              <td className="px-2 py-2 text-center">{frontPar}</td>
              <td className="px-2 py-2 text-center">{backPar}</td>
              <td className="px-2 py-2 text-center">{frontPar + backPar}</td>
            </tr>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <td className="px-2 py-2 font-medium">Hcp</td>
              {input.holes.map((hole) => (
                <td key={hole.id} className="px-2 py-2 text-center">
                  {hole.handicap ?? "-"}
                </td>
              ))}
              <td className="px-2 py-2 text-center">-</td>
              <td className="px-2 py-2 text-center">-</td>
              <td className="px-2 py-2 text-center">-</td>
            </tr>
            <tr>
              <td className="px-2 py-2 font-medium">Score</td>
              {input.holes.map((hole) => {
                const strokes = scoresByHoleId.get(hole.id);
                return (
                  <td key={hole.id} className="px-2 py-2 text-center">
                    {strokes ? <ScoreCell score={strokes} par={hole.par} /> : "-"}
                  </td>
                );
              })}
              <td className="px-2 py-2 text-center font-semibold">{frontScore || "-"}</td>
              <td className="px-2 py-2 text-center font-semibold">{backScore || "-"}</td>
              <td className="px-2 py-2 text-center font-semibold">
                {input.teamSummary.grossScore || "-"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreCell(input: { score: number; par: number }) {
  const delta = input.score - input.par;
  if (delta <= -2) {
    return (
      <span className="inline-flex min-w-6 items-center justify-center rounded-full border-2 border-zinc-900 px-1 py-0.5 ring-1 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100">
        {input.score}
      </span>
    );
  }

  if (delta === -1) {
    return (
      <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-zinc-900 px-1 py-0.5 dark:border-zinc-100">
        {input.score}
      </span>
    );
  }

  return <span>{input.score}</span>;
}
