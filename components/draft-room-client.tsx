"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { draftPlayer, getDraftSnapshot, moveTeamDraftOrder } from "@/services/draft";
import { listTournaments } from "@/services/tournamentSetup";
import type { Player, TeamRosterEntry } from "@/types";

const DRAFT_QUERY_STALE_TIME_MS = 60_000;

type Notice = {
  kind: "success" | "error";
  text: string;
};

export default function DraftRoomClient() {
  const queryClient = useQueryClient();
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const tournamentsQuery = useQuery({
    queryKey: ["tournaments"],
    queryFn: listTournaments,
    staleTime: DRAFT_QUERY_STALE_TIME_MS,
  });

  const effectiveTournamentId = useMemo(
    () => selectedTournamentId || tournamentsQuery.data?.[0]?.id || "",
    [selectedTournamentId, tournamentsQuery.data],
  );

  const draftQuery = useQuery({
    queryKey: ["draft-snapshot", effectiveTournamentId],
    queryFn: () => getDraftSnapshot(effectiveTournamentId),
    enabled: Boolean(effectiveTournamentId),
    staleTime: DRAFT_QUERY_STALE_TIME_MS,
  });

  async function refreshDraft() {
    if (!effectiveTournamentId) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["draft-snapshot", effectiveTournamentId],
    });
    await draftQuery.refetch();
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Draft action failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  const draftSnapshot = draftQuery.data ?? null;
  const canReorderTeams =
    draftSnapshot?.teams.every((team) => team.players.length <= 1) ?? false;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Snake Draft</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Captains stay fixed as roster slot one. The remaining draft picks follow
          snake order and persist to <code>team_players</code>.
        </p>
      </header>

      <label className="grid gap-2 text-sm sm:max-w-sm">
        <span className="font-medium">Tournament</span>
        <select
          className="rounded-full border border-zinc-300 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
          value={effectiveTournamentId}
          onChange={(event) => setSelectedTournamentId(event.target.value)}
        >
          <option value="">Select tournament</option>
          {(tournamentsQuery.data ?? []).map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>
      </label>

      {notice ? (
        <p
          className={
            notice.kind === "success"
              ? "rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800"
              : "rounded-md bg-red-100 px-3 py-2 text-sm text-red-800"
          }
        >
          {notice.text}
        </p>
      ) : null}

      {tournamentsQuery.error instanceof Error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
          {tournamentsQuery.error.message}
        </p>
      ) : null}

      {draftQuery.error instanceof Error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
          {draftQuery.error.message}
        </p>
      ) : null}

      {draftQuery.isLoading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Loading draft room...</p>
      ) : null}

      {draftSnapshot ? (
        <>
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">
                  Current pick
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {draftSnapshot.nextPick
                    ? `${draftSnapshot.nextPick.teamName} are on the clock`
                    : "Draft complete"}
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {draftSnapshot.nextPick
                    ? `Round ${draftSnapshot.nextPick.round}, pick ${draftSnapshot.nextPick.overallPick}`
                    : "Every team has a full roster."}
                </div>
              </div>
              <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">
                Max roster size: <strong>{draftSnapshot.maxPlayersPerTeam}</strong>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="grid gap-4 sm:grid-cols-2">
              {draftSnapshot.teams.map((teamSummary) => (
                <div
                  key={teamSummary.team.id}
                  className={`rounded-3xl border p-4 shadow-sm ${
                    draftSnapshot.nextPick?.teamId === teamSummary.team.id
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide opacity-70">
                        Draft order #{teamSummary.team.draftOrder}
                      </div>
                      <h2 className="mt-1 text-lg font-semibold">
                        {teamSummary.team.name}
                      </h2>
                      <div className="mt-1 text-sm opacity-80">
                        Captain: {teamSummary.captain?.name ?? "Unknown"}
                      </div>
                    </div>
                    {canReorderTeams ? (
                      <div className="flex gap-2">
                        <button
                          className="rounded-full border px-3 py-2 text-xs shadow-sm disabled:opacity-40"
                          disabled={busy || teamSummary.team.draftOrder === 1}
                          onClick={() =>
                            void runAction(async () => {
                              await moveTeamDraftOrder({
                                tournamentId: draftSnapshot.tournament.id,
                                teamId: teamSummary.team.id,
                                direction: "up",
                              });
                              await refreshDraft();
                              setNotice({
                                kind: "success",
                                text: `Moved ${teamSummary.team.name} earlier in the draft order.`,
                              });
                            })
                          }
                        >
                          ↑
                        </button>
                        <button
                          className="rounded-full border px-3 py-2 text-xs shadow-sm disabled:opacity-40"
                          disabled={
                            busy ||
                            teamSummary.team.draftOrder === draftSnapshot.teams.length
                          }
                          onClick={() =>
                            void runAction(async () => {
                              await moveTeamDraftOrder({
                                tournamentId: draftSnapshot.tournament.id,
                                teamId: teamSummary.team.id,
                                direction: "down",
                              });
                              await refreshDraft();
                              setNotice({
                                kind: "success",
                                text: `Moved ${teamSummary.team.name} later in the draft order.`,
                              });
                            })
                          }
                        >
                          ↓
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-2">
                    {teamSummary.players.map((player) => (
                      <DraftedPlayerRow
                        key={`${teamSummary.team.id}-${player.playerId}`}
                        player={player}
                      />
                    ))}
                    {Array.from({
                      length: Math.max(
                        draftSnapshot.maxPlayersPerTeam - teamSummary.players.length,
                        0,
                      ),
                    }).map((_, index) => (
                      <div
                        key={`open-slot-${teamSummary.team.id}-${index}`}
                        className="rounded-2xl border border-dashed border-current/25 px-3 py-3 text-sm opacity-60"
                      >
                        Open roster slot
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <aside className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Available players</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    Tap a player to make the current pick.
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
                  {draftSnapshot.availablePlayers.length} left
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {draftSnapshot.availablePlayers.map((player) => {
                  const canDraft =
                    Boolean(draftSnapshot.nextPick) &&
                    !busy &&
                    !draftSnapshot.isComplete;

                  return (
                    <button
                      key={player.id}
                      className="rounded-2xl border border-zinc-200 px-4 py-4 text-left shadow-sm transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700"
                      disabled={!canDraft}
                      onClick={() =>
                        void runAction(async () => {
                          if (!draftSnapshot.nextPick) {
                            return;
                          }

                          await draftPlayer({
                            tournamentId: draftSnapshot.tournament.id,
                            teamId: draftSnapshot.nextPick.teamId,
                            playerId: player.id,
                          });
                          await refreshDraft();
                          setNotice({
                            kind: "success",
                            text: `${player.name} drafted by ${draftSnapshot.nextPick.teamName}.`,
                          });
                        })
                      }
                    >
                      <PlayerCardContent player={player} />
                    </button>
                  );
                })}

                {draftSnapshot.availablePlayers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700">
                    No players remain in the draft pool.
                  </div>
                ) : null}
              </div>
            </aside>
          </section>
        </>
      ) : null}
    </div>
  );
}

function DraftedPlayerRow({ player }: { player: TeamRosterEntry }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-black/5 px-3 py-3 dark:bg-white/10">
      <PlayerAvatar name={player.playerName} photoUrl={player.playerPhotoUrl} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{player.playerName}</div>
        <div className="text-xs opacity-70">
          {player.draftPosition === 1
            ? "Captain"
            : `Draft pick #${player.draftPosition - 1}`}
        </div>
      </div>
    </div>
  );
}

function PlayerCardContent({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-3">
      <PlayerAvatar name={player.name} photoUrl={player.photoUrl} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{player.name}</div>
        <div className="text-xs text-zinc-500">
          Golf {player.golfHandicap ?? "-"} · Beer {player.beerHandicap ?? "-"}
        </div>
      </div>
    </div>
  );
}

function PlayerAvatar(input: { name: string; photoUrl: string | null }) {
  const initials = input.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (input.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={input.name}
        className="h-12 w-12 rounded-full object-cover"
        src={input.photoUrl}
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
      {initials}
    </div>
  );
}
