"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDraftTeam,
  draftPlayer,
  getDraftSnapshot,
  moveTeamDraftOrder,
  removeDraftPlayer,
  removeDraftTeam,
  renameDraftTeam,
  undoLastDraftPick,
} from "@/services/draft";
import {
  createPlayer,
  listTournaments,
  updatePlayerHandicaps,
} from "@/services/tournamentSetup";
import type { Player, TeamRosterEntry } from "@/types";

const DRAFT_QUERY_STALE_TIME_MS = 60_000;

type Notice = {
  kind: "success" | "error";
  text: string;
};

function toNumberOrUndefined(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function DraftRoomClient() {
  const queryClient = useQueryClient();
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerGolfHandicap, setNewPlayerGolfHandicap] = useState("");
  const [newPlayerBeerHandicap, setNewPlayerBeerHandicap] = useState("");
  const [teamNameDrafts, setTeamNameDrafts] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (!draftQuery.data) {
      return;
    }

    setTeamNameDrafts((current) => {
      const next: Record<string, string> = {};
      for (const teamSummary of draftQuery.data.teams) {
        next[teamSummary.team.id] =
          current[teamSummary.team.id] ?? teamSummary.team.name;
      }
      return next;
    });
  }, [draftQuery.data]);

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

  async function handleAddTeam() {
    const name = window.prompt("Team name");
    if (!name?.trim() || !draftSnapshot) {
      return;
    }

    await runAction(async () => {
      await createDraftTeam({
        tournamentId: draftSnapshot.tournament.id,
        name: name.trim(),
      });
      await refreshDraft();
      setNotice({ kind: "success", text: "Team added." });
    });
  }

  const draftSnapshot = draftQuery.data ?? null;
  const canReorderTeams =
    draftSnapshot?.teams.every((team) => team.players.length === 0) ?? false;
  const canUndo = draftSnapshot?.teams.some((team) => team.players.length > 0) ?? false;
  const canDraft = Boolean(draftSnapshot?.nextPick) && !busy && !draftSnapshot?.isComplete;
  const draftBlockedMessage = !draftSnapshot
    ? null
    : draftSnapshot.teams.length < 2
      ? "Add at least two teams to start drafting."
      : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Snake Draft</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Manage teams, players, handicaps, and draft picks here.
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
                    : draftSnapshot.isComplete
                      ? "Draft complete"
                      : "Draft not ready"}
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {draftSnapshot.nextPick
                    ? draftSnapshot.nextPick.round === 1
                      ? `Captain round · pick ${draftSnapshot.nextPick.overallPick}`
                      : `Round ${draftSnapshot.nextPick.round - 1}, pick ${draftSnapshot.nextPick.overallPick}`
                    : draftSnapshot.isComplete
                      ? "Every team has a full roster."
                      : (draftBlockedMessage ?? "Complete setup to begin drafting.")}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  title="Add team"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-lg font-semibold shadow-sm transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  disabled={busy || !draftSnapshot}
                  onClick={() => void handleAddTeam()}
                >
                  +
                </button>
                <button
                  title="Undo last pick"
                  className="rounded-full border border-zinc-300 px-3 py-2 text-sm shadow-sm transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  disabled={busy || !canUndo}
                  onClick={() =>
                    void runAction(async () => {
                      await undoLastDraftPick(draftSnapshot.tournament.id);
                      await refreshDraft();
                      setNotice({ kind: "success", text: "Last pick undone." });
                    })
                  }
                >
                  ↩ Undo
                </button>
                <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">
                  Max roster size: <strong>{draftSnapshot.maxPlayersPerTeam}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="grid self-start items-start gap-4 sm:grid-cols-2">
              {draftSnapshot.teams.map((teamSummary) => {
                const draftName = teamNameDrafts[teamSummary.team.id] ?? teamSummary.team.name;

                return (
                  <div
                    key={teamSummary.team.id}
                    className={`self-start rounded-3xl border p-4 shadow-sm ${
                      draftSnapshot.nextPick?.teamId === teamSummary.team.id
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs uppercase tracking-wide opacity-70">
                        Draft order #{teamSummary.team.draftOrder}
                      </div>
                      <div className="flex items-center gap-1">
                        {canReorderTeams ? (
                          <>
                            <button
                              className="rounded-full border px-2 py-1 text-[10px] shadow-sm disabled:opacity-40"
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
                              className="rounded-full border px-2 py-1 text-[10px] shadow-sm disabled:opacity-40"
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
                          </>
                        ) : null}
                        <button
                          className="rounded-full border border-red-300 px-2 py-1 text-[10px] font-semibold text-red-700 shadow-sm disabled:opacity-40 dark:border-red-600 dark:text-red-300"
                          disabled={busy || !canReorderTeams}
                          onClick={() =>
                            void runAction(async () => {
                              await removeDraftTeam({
                                tournamentId: draftSnapshot.tournament.id,
                                teamId: teamSummary.team.id,
                              });
                              await refreshDraft();
                              setNotice({ kind: "success", text: "Team removed." });
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                      <input
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                        value={draftName}
                        onChange={(event) =>
                          setTeamNameDrafts((current) => ({
                            ...current,
                            [teamSummary.team.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium shadow-sm disabled:opacity-40 dark:border-zinc-600"
                        disabled={busy || !draftName.trim() || draftName.trim() === teamSummary.team.name}
                        onClick={() =>
                          void runAction(async () => {
                            await renameDraftTeam({
                              teamId: teamSummary.team.id,
                              name: draftName,
                            });
                            await refreshDraft();
                            setNotice({ kind: "success", text: "Team renamed." });
                          })
                        }
                      >
                        Save name
                      </button>
                    </div>

                    <div className="mt-2 text-xs opacity-70">
                      {teamSummary.captain
                        ? `Captain: ${teamSummary.captain.name}`
                        : "First draft pick becomes captain."}
                    </div>

                    {!canReorderTeams ? (
                      <div className="mt-2 text-xs opacity-70">
                        Team order locks after the first pick.
                      </div>
                    ) : null}

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
                );
              })}
            </div>

            <aside className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 lg:overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Available players</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    Create, remove, edit handicaps, then draft.
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
                  {draftSnapshot.availablePlayers.length} left
                </div>
              </div>

              <div className="mt-4 grid gap-2 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-700">
                {!showAddPlayerForm ? (
                  <button
                    className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    onClick={() => setShowAddPlayerForm(true)}
                  >
                    + Add Player
                  </button>
                ) : (
                  <>
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Add player
                    </div>
                    <input
                      className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                      placeholder="Player name"
                      value={newPlayerName}
                      onChange={(event) => setNewPlayerName(event.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                        placeholder="Golf hcp"
                        value={newPlayerGolfHandicap}
                        onChange={(event) => setNewPlayerGolfHandicap(event.target.value)}
                      />
                      <input
                        className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                        placeholder="Beer hcp"
                        value={newPlayerBeerHandicap}
                        onChange={(event) => setNewPlayerBeerHandicap(event.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
                        onClick={() => setShowAddPlayerForm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
                        disabled={busy || !newPlayerName.trim()}
                        onClick={() =>
                          void runAction(async () => {
                            const created = await createPlayer({
                              tournamentId: draftSnapshot.tournament.id,
                              name: newPlayerName,
                              golfHandicap: toNumberOrUndefined(newPlayerGolfHandicap),
                              beerHandicap: toNumberOrUndefined(newPlayerBeerHandicap),
                            });
                            setNewPlayerName("");
                            setNewPlayerGolfHandicap("");
                            setNewPlayerBeerHandicap("");
                            setShowAddPlayerForm(false);
                            await refreshDraft();
                            setNotice({
                              kind: "success",
                              text: `Added ${created.name} to the player pool.`,
                            });
                          })
                        }
                      >
                        Save
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {draftSnapshot.availablePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="relative rounded-2xl border border-zinc-200 px-3 py-3 shadow-sm dark:border-zinc-700"
                  >
                    <button
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-950/40"
                      disabled={busy}
                      onClick={() =>
                        void runAction(async () => {
                          await removeDraftPlayer(player.id);
                          await refreshDraft();
                          setNotice({
                            kind: "success",
                            text: `${player.name} removed from player pool.`,
                          });
                        })
                      }
                    >
                      ×
                    </button>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <PlayerCardContent player={player} />
                      </div>
                      <button
                        className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600"
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
                        Draft
                      </button>
                    </div>
                    <EditableHandicapRow
                      busy={busy}
                      player={player}
                      onSave={(golfHandicap, beerHandicap) =>
                        runAction(async () => {
                          await updatePlayerHandicaps({
                            playerId: player.id,
                            golfHandicap,
                            beerHandicap,
                          });
                          await refreshDraft();
                          setNotice({
                            kind: "success",
                            text: `Updated handicaps for ${player.name}.`,
                          });
                        })
                      }
                    />
                  </div>
                ))}

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
            : `Pick #${player.draftPosition - 1}`}
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

function EditableHandicapRow(input: {
  player: Player;
  busy: boolean;
  onSave: (golfHandicap: number | undefined, beerHandicap: number | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [golfHandicap, setGolfHandicap] = useState(
    input.player.golfHandicap?.toString() ?? "",
  );
  const [beerHandicap, setBeerHandicap] = useState(
    input.player.beerHandicap?.toString() ?? "",
  );

  useEffect(() => {
    setGolfHandicap(input.player.golfHandicap?.toString() ?? "");
    setBeerHandicap(input.player.beerHandicap?.toString() ?? "");
  }, [input.player.beerHandicap, input.player.golfHandicap]);

  if (!editing) {
    return (
      <button
        className="mt-2 rounded-lg bg-zinc-100 px-2 py-1 text-left text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
        onClick={() => setEditing(true)}
      >
        Golf {input.player.golfHandicap ?? "-"} · Beer {input.player.beerHandicap ?? "-"}
      </button>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
      <input
        className="rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900"
        placeholder="Golf hcp"
        value={golfHandicap}
        onChange={(event) => setGolfHandicap(event.target.value)}
      />
      <input
        className="rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900"
        placeholder="Beer hcp"
        value={beerHandicap}
        onChange={(event) => setBeerHandicap(event.target.value)}
      />
      <button
        className="rounded border border-zinc-300 px-2 py-1.5 text-xs font-medium dark:border-zinc-600"
        disabled={input.busy}
        onClick={() =>
          void (async () => {
            await input.onSave(
              toNumberOrUndefined(golfHandicap),
              toNumberOrUndefined(beerHandicap),
            );
            setEditing(false);
          })()
        }
      >
        Save
      </button>
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
