"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveMutationQueue } from "@/hooks/use-live-mutation-queue";
import {
  formatGolfScoreWithToPar,
  formatThruLabel,
  formatToParScore,
} from "@/lib/scoreDisplay";
import { applyLiveMutations } from "@/lib/liveMutations";
import { useTournamentSnapshot } from "@/hooks/use-tournament-snapshot";
import {
  updateTournamentStatus,
  validateTeamAccess,
} from "@/services/liveTournament";
import type { BeerEvent, BeerEventType, TeamRosterEntry } from "@/types";

type Notice = {
  kind: "success" | "error";
  text: string;
};

type DrinkModalState = {
  type: BeerEventType;
  title: string;
};

type UndoDrinkState = {
  type: BeerEventType;
  event?: BeerEvent;
  playerName?: string;
};

type ScoreFeedback = {
  holeId: string;
  strokes: number;
};

export default function LiveTournamentClient(input: {
  initialTournamentId?: string;
  initialTeamId?: string;
  accessToken?: string;
  hideTournamentSelector?: boolean;
  lockTeam?: boolean;
  leaderboardHref?: string;
}) {
  const {
    tournaments,
    selectedTournamentId,
    setSelectedTournamentId,
    snapshot: confirmedSnapshot,
    loading,
    error,
    refreshSnapshot,
  } = useTournamentSnapshot(input.initialTournamentId);
  const mutationQueue = useLiveMutationQueue();
  const snapshot = useMemo(
    () => applyLiveMutations(confirmedSnapshot, mutationQueue.mutations),
    [confirmedSnapshot, mutationQueue.mutations],
  );
  const [selectedTeamId, setSelectedTeamId] = useState(input.initialTeamId ?? "");
  const [selectedHoleId, setSelectedHoleId] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [drinkModal, setDrinkModal] = useState<DrinkModalState | null>(null);
  const [undoDrink, setUndoDrink] = useState<UndoDrinkState | null>(null);
  const [scoreFeedback, setScoreFeedback] = useState<ScoreFeedback | null>(null);
  const scoreAdvanceTimerRef = useRef<number | null>(null);
  const [accessState, setAccessState] = useState<{
    checked: boolean;
    error: string | null;
  }>({ checked: !input.lockTeam, error: null });

  const missingAccessError =
    input.lockTeam && (!input.initialTournamentId || !input.initialTeamId || !input.accessToken)
      ? "This team live link is missing access details."
      : null;

  useEffect(() => {
    if (!input.lockTeam || missingAccessError) {
      return;
    }

    const tournamentId = input.initialTournamentId!;
    const teamId = input.initialTeamId!;
    const accessToken = input.accessToken!;
    let cancelled = false;

    void (async () => {
      try {
        await validateTeamAccess({ tournamentId, teamId, accessToken });
        if (!cancelled) {
          setAccessState({ checked: true, error: null });
        }
      } catch (validationError) {
        if (!cancelled) {
          setAccessState({
            checked: true,
            error:
              validationError instanceof Error
                ? validationError.message
                : "This team link is invalid.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    input.accessToken,
    input.initialTeamId,
    input.initialTournamentId,
    input.lockTeam,
    missingAccessError,
  ]);

  const effectiveSelectedTeamId =
    input.lockTeam && input.initialTeamId
      ? input.initialTeamId
      : snapshot?.teams.some((teamSummary) => teamSummary.team.id === selectedTeamId)
        ? selectedTeamId
        : (snapshot?.teams[0]?.team.id ?? "");

  const selectedTeam =
    snapshot?.teams.find((teamSummary) => teamSummary.team.id === effectiveSelectedTeamId) ??
    null;
  const birdieJuiceEnabled = snapshot?.tournament.birdieJuiceEnabled ?? false;

  const availableHoles = snapshot?.holes ?? [];
  const effectiveSelectedHoleId =
    availableHoles.some((hole) => hole.id === selectedHoleId)
      ? selectedHoleId
      : (selectedTeam?.currentHole?.id ?? availableHoles[0]?.id ?? "");
  const displayedHole =
    availableHoles.find((hole) => hole.id === effectiveSelectedHoleId) ?? null;
  const displayedHoleIndex = displayedHole
    ? availableHoles.findIndex((hole) => hole.id === displayedHole.id)
    : -1;
  const displayedHoleScore =
    selectedTeam?.scores.find((score) => score.holeId === displayedHole?.id) ?? null;
  const selectedTeamMutations = mutationQueue.mutations.filter(
    (mutation) =>
      mutation.tournamentId === snapshot?.tournament.id &&
      mutation.teamId === selectedTeam?.team.id,
  );
  const displayedHoleMutation = selectedTeamMutations.find(
    (mutation) =>
      mutation.kind === "score" && mutation.holeId === displayedHole?.id,
  );
  const failedMutation =
    selectedTeamMutations.find((mutation) => mutation.status === "failed") ?? null;
  const pendingMutationCount = selectedTeamMutations.filter(
    (mutation) => mutation.status !== "failed",
  ).length;

  function cancelScoreAdvance() {
    if (scoreAdvanceTimerRef.current !== null) {
      window.clearTimeout(scoreAdvanceTimerRef.current);
      scoreAdvanceTimerRef.current = null;
    }
    setScoreFeedback(null);
  }

  useEffect(
    () => () => {
      if (scoreAdvanceTimerRef.current !== null) {
        window.clearTimeout(scoreAdvanceTimerRef.current);
      }
    },
    [],
  );

  async function runAction(action: () => Promise<void>) {
    setSubmitting(true);
    try {
      await action();
    } catch (actionError) {
      setNotice({
        kind: "error",
        text:
          actionError instanceof Error
            ? actionError.message
            : "Tournament action failed.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (input.lockTeam && !accessState.checked) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-300">Checking team link...</p>;
  }

  if (missingAccessError) {
    return (
      <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
        {missingAccessError}
      </p>
    );
  }

  if (accessState.error) {
    return (
      <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
        {accessState.error}
      </p>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-1rem)] flex-col gap-2 overflow-hidden pb-18">

      {!input.hideTournamentSelector ? (
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Tournament</span>
          <select
            className="rounded-full border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={selectedTournamentId}
            onChange={(event) => {
              cancelScoreAdvance();
              setSelectedTournamentId(event.target.value);
            }}
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

      {snapshot && selectedTeam && (pendingMutationCount > 0 || !mutationQueue.isOnline) ? (
        <p
          aria-live="polite"
          className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900"
        >
          {mutationQueue.isOnline
            ? `Saving ${pendingMutationCount} ${pendingMutationCount === 1 ? "entry" : "entries"}...`
            : pendingMutationCount > 0
              ? `${pendingMutationCount} ${pendingMutationCount === 1 ? "entry" : "entries"} saved on this device. Will retry when online.`
              : "You are offline. New entries will be saved on this device."}
        </p>
      ) : null}

      {failedMutation ? (
        <div
          aria-live="assertive"
          className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-900"
        >
          <p>{failedMutation.error ?? "An entry could not be saved."}</p>
          <div className="mt-2 flex gap-2">
            <button
              className="rounded-full bg-red-800 px-3 py-1.5 text-xs font-medium text-white"
              onClick={() => mutationQueue.retryMutation(failedMutation.operationId)}
            >
              Retry
            </button>
            <button
              className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium"
              onClick={() => mutationQueue.discardMutation(failedMutation.operationId)}
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {!input.lockTeam && snapshot ? (
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full bg-zinc-900 px-4 py-2 text-xs text-white shadow-sm disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            disabled={submitting || snapshot.tournament.status === "live"}
            onClick={() =>
              void runAction(async () => {
                await updateTournamentStatus({
                  tournamentId: snapshot.tournament.id,
                  status: "live",
                });
                await refreshSnapshot(snapshot.tournament.id);
                setNotice({ kind: "success", text: "Tournament is now live." });
              })
            }
          >
            Start
          </button>
          <button
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs shadow-sm disabled:opacity-40 dark:border-zinc-700"
            disabled={submitting || snapshot.tournament.status === "complete"}
            onClick={() =>
              void runAction(async () => {
                await updateTournamentStatus({
                  tournamentId: snapshot.tournament.id,
                  status: "complete",
                });
                await refreshSnapshot(snapshot.tournament.id);
                setNotice({ kind: "success", text: "Tournament marked complete." });
              })
            }
          >
            Complete
          </button>
        </div>
      ) : null}

      {loading && !snapshot ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Loading live tournament...</p>
      ) : null}

      {snapshot && input.lockTeam && !selectedTeam ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
          This team is not part of the requested tournament.
        </p>
      ) : null}

      {snapshot && selectedTeam ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          {!input.lockTeam ? (
            <div className="grid grid-cols-2 gap-2">
              {snapshot.teams.map((teamSummary) => (
                <button
                  key={teamSummary.team.id}
                  className={`rounded-2xl px-3 py-2 text-left text-xs shadow-sm ${
                    effectiveSelectedTeamId === teamSummary.team.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-200 dark:border-zinc-700"
                  }`}
                  onClick={() => {
                    cancelScoreAdvance();
                    setSelectedTeamId(teamSummary.team.id);
                  }}
                >
                  <div className="font-medium">{teamSummary.team.name}</div>
                  <div className="mt-0.5 opacity-75">
                    {formatToParScore(teamSummary.toParScore)} {formatThruLabel(teamSummary.holesPlayed)}
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          <section className="rounded-[2rem] bg-gradient-to-b from-zinc-900 to-zinc-800 p-4 text-white shadow-lg dark:from-zinc-100 dark:to-zinc-200 dark:text-zinc-900">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-[0.18em] opacity-70">
                  {snapshot.tournament.name}
                </p>
                <h2 className="truncate text-lg font-semibold">{selectedTeam.team.name}</h2>
                <p className="text-xs opacity-75">
                  {selectedTeam.holesPlayed} holes played
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-semibold">
                  {formatToParScore(selectedTeam.toParScore)}
                </div>
                <div className="text-[10px] uppercase tracking-wide opacity-70">
                  Team score (to par)
                </div>
              </div>
            </div>

            <div
              className={`mt-3 grid gap-2 rounded-2xl bg-white/8 p-3 text-center dark:bg-black/8 ${birdieJuiceEnabled ? "grid-cols-3" : "grid-cols-2"}`}
            >
              <SummaryStat
                label="Golf"
                value={formatGolfScoreWithToPar(
                  selectedTeam.grossScore,
                  selectedTeam.parPlayed,
                )}
              />
              <SummaryStat label="Beer bonus" value={`-${selectedTeam.beerBonus}`} />
              {birdieJuiceEnabled ? (
                <SummaryStat
                  danger={selectedTeam.birdieDebt > 0}
                  label="Birdie debt"
                  value={selectedTeam.birdieDebt.toString()}
                />
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-700">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Hole scoring</h3>
              <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-900">
                <button
                  className="h-7 w-7 rounded-full border border-zinc-200 bg-white text-xs shadow-sm disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950"
                  disabled={displayedHoleIndex <= 0}
                  onClick={() => {
                    const previousHole = availableHoles[displayedHoleIndex - 1];
                    if (previousHole) {
                      cancelScoreAdvance();
                      setSelectedHoleId(previousHole.id);
                    }
                  }}
                >
                  ‹
                </button>
                <div className="min-w-20 text-center">
                  <div className="text-sm font-semibold">
                    {displayedHole ? `Hole ${displayedHole.number}` : "--"}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {displayedHole
                      ? `Par ${displayedHole.par}${displayedHoleScore ? ` · ${displayedHoleScore.strokes}` : ""}`
                      : "No hole"}
                  </div>
                </div>
                <button
                  className="h-7 w-7 rounded-full border border-zinc-200 bg-white text-xs shadow-sm disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950"
                  disabled={
                    displayedHoleIndex === -1 || displayedHoleIndex >= availableHoles.length - 1
                  }
                  onClick={() => {
                    const nextHole = availableHoles[displayedHoleIndex + 1];
                    if (nextHole) {
                      cancelScoreAdvance();
                      setSelectedHoleId(nextHole.id);
                    }
                  }}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                <ScoreButton
                  key={score}
                  disabled={!displayedHole}
                  isSelected={
                    scoreFeedback && scoreFeedback.holeId === displayedHole?.id
                      ? scoreFeedback.strokes === score
                      : displayedHoleScore?.strokes === score
                  }
                  score={score}
                  onClick={() => {
                    if (
                      !displayedHole ||
                      (scoreFeedback && scoreFeedback.holeId === displayedHole.id
                        ? scoreFeedback.strokes === score
                        : displayedHoleScore?.strokes === score)
                    ) {
                      return;
                    }
                    if (scoreAdvanceTimerRef.current !== null) {
                      window.clearTimeout(scoreAdvanceTimerRef.current);
                    }
                    setSelectedHoleId(displayedHole.id);
                    setScoreFeedback({ holeId: displayedHole.id, strokes: score });
                    mutationQueue.enqueueScore({
                      tournamentId: snapshot.tournament.id,
                      teamId: selectedTeam.team.id,
                      holeId: displayedHole.id,
                      strokes: score,
                    });
                    setNotice(null);
                    if ("vibrate" in navigator) {
                      navigator.vibrate(25);
                    }
                    const nextHole = availableHoles[displayedHoleIndex + 1];
                    scoreAdvanceTimerRef.current = window.setTimeout(() => {
                      if (nextHole) {
                        setSelectedHoleId(nextHole.id);
                      }
                      setScoreFeedback(null);
                      scoreAdvanceTimerRef.current = null;
                    }, 1_000);
                  }}
                />
              ))}
            </div>
            <p aria-live="polite" className="mt-2 text-center text-xs text-zinc-500">
              {scoreFeedback && scoreFeedback.holeId === displayedHole?.id
                ? `Recorded ${scoreFeedback.strokes}.${availableHoles[displayedHoleIndex + 1] ? " Moving to the next hole..." : ""}`
                : displayedHoleMutation
                ? displayedHoleMutation.status === "failed"
                  ? "Score not saved - retry or discard above."
                  : mutationQueue.isOnline
                    ? "Saving score..."
                    : "Score saved on this device."
                : displayedHoleScore
                  ? "Score saved."
                  : "Tap a score to record this hole."}
            </p>
          </section>

          <section className={`grid gap-2 ${birdieJuiceEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
            <LongPressActionButton
              className="rounded-[1.75rem] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-white shadow-lg"
              disabled={selectedTeam.players.length === 0}
              icon="🍺"
              label="Beer"
              hint="Hold to subtract"
              onClick={() => setDrinkModal({ type: "normal", title: "Who drank the beer?" })}
              onLongPress={() => setUndoDrink({ type: "normal" })}
            />
            {birdieJuiceEnabled ? (
              <LongPressActionButton
                className="rounded-[1.75rem] bg-gradient-to-b from-orange-400 via-red-500 to-red-700 text-white shadow-lg"
                disabled={selectedTeam.players.length === 0}
                icon="🥃"
                label="Birdie Juice"
                hint="Hold to subtract"
                onClick={() =>
                  setDrinkModal({ type: "birdie_juice", title: "Who drank the birdie juice?" })
                }
                onLongPress={() => setUndoDrink({ type: "birdie_juice" })}
              />
            ) : null}
          </section>
        </div>
      ) : null}

      {input.leaderboardHref ? (
        <div className="fixed inset-x-4 bottom-4 z-10 mx-auto max-w-md">
          <div className="grid grid-cols-2 gap-2 rounded-full border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
            <div className="rounded-full bg-zinc-900 px-3 py-2.5 text-center text-sm font-medium text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900">
              Team Live
            </div>
            <Link
              className="rounded-full border border-zinc-200 px-3 py-2.5 text-center text-sm font-medium shadow-sm dark:border-zinc-700"
              href={input.leaderboardHref}
            >
              Leaderboard
            </Link>
          </div>
        </div>
      ) : null}

      {drinkModal && selectedTeam && snapshot ? (
        <PickerModal
          title={drinkModal.title}
          players={selectedTeam.players}
          events={selectedTeam.beerEvents}
          type={drinkModal.type}
          action="record"
          onClose={() => setDrinkModal(null)}
          onSelect={(playerId) => {
              mutationQueue.enqueueDrink({
                tournamentId: snapshot.tournament.id,
                teamId: selectedTeam.team.id,
                playerId,
                holeId: selectedTeam.currentHole?.id ?? displayedHole?.id ?? null,
                drinkType: drinkModal.type,
              });
              setDrinkModal(null);
              setNotice(null);
              if ("vibrate" in navigator) {
                navigator.vibrate(25);
              }
            }}
        />
      ) : null}

      {undoDrink && !undoDrink.event && selectedTeam && snapshot ? (
        <PickerModal
          title={
            undoDrink.type === "normal"
              ? "Subtract a beer from whom?"
              : "Subtract birdie juice from whom?"
          }
          players={selectedTeam.players}
          events={selectedTeam.beerEvents}
          type={undoDrink.type}
          action="remove"
          onClose={() => setUndoDrink(null)}
          onSelect={(playerId) => {
            const player = selectedTeam.players.find(
              (entry) => entry.playerId === playerId,
            );
            const latestEvent = [...selectedTeam.beerEvents]
              .filter(
                (event) =>
                  event.type === undoDrink.type && event.playerId === playerId,
              )
              .sort(
                (left, right) =>
                  Date.parse(right.createdAt) - Date.parse(left.createdAt),
              )[0];
            if (!player || !latestEvent) {
              setNotice({
                kind: "error",
                text: "That player has no matching drink to subtract.",
              });
              setUndoDrink(null);
              return;
            }
            setUndoDrink({
              type: undoDrink.type,
              event: latestEvent,
              playerName: player.playerName,
            });
          }}
        />
      ) : null}

      {undoDrink?.event && undoDrink.playerName && selectedTeam && snapshot ? (
        <ConfirmModal
          title={
            undoDrink.type === "normal"
              ? `Subtract one beer from ${undoDrink.playerName}?`
              : `Subtract one birdie juice from ${undoDrink.playerName}?`
          }
          onCancel={() => setUndoDrink(null)}
          onConfirm={() => {
            mutationQueue.enqueueDrinkUndo({
              tournamentId: snapshot.tournament.id,
              teamId: selectedTeam.team.id,
              event: undoDrink.event!,
            });
            setNotice(null);
            setUndoDrink(null);
          }}
        />
      ) : null}
    </div>
  );
}

function SummaryStat(input: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/8 px-2 py-2 dark:bg-black/8">
      <div className="text-[10px] uppercase tracking-wide opacity-70">{input.label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${input.danger ? "text-red-300 dark:text-red-700" : ""}`}>
        {input.value}
      </div>
    </div>
  );
}

function ScoreButton(input: {
  disabled: boolean;
  isSelected: boolean;
  score: number;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={input.isSelected}
      className={`flex aspect-square touch-manipulation items-center justify-center rounded-[1.5rem] text-xl font-semibold shadow-[inset_0_2px_0_rgba(255,255,255,0.2),inset_0_-8px_12px_rgba(0,0,0,0.22),0_12px_22px_rgba(0,0,0,0.16)] transition duration-75 active:translate-y-0.5 active:scale-95 active:shadow-inner disabled:opacity-40 ${
        input.isSelected
          ? "bg-gradient-to-b from-emerald-400 to-emerald-700 text-white"
          : "bg-gradient-to-b from-zinc-700 to-zinc-900 text-white dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-900"
      }`}
      disabled={input.disabled}
      onClick={input.onClick}
    >
      {input.score}
    </button>
  );
}

function LongPressActionButton(input: {
  className: string;
  disabled: boolean;
  icon: string;
  label: string;
  hint?: string;
  onClick: () => void;
  onLongPress: () => void;
}) {
  const timerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return (
    <button
      className={`${input.className} flex min-h-20 items-center justify-center gap-2 px-3 py-4 disabled:opacity-40`}
      disabled={input.disabled}
      onPointerDown={() => {
        longPressTriggeredRef.current = false;
        timerRef.current = window.setTimeout(() => {
          longPressTriggeredRef.current = true;
          input.onLongPress();
        }, 650);
      }}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onClick={() => {
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }
        input.onClick();
      }}
    >
      <span className="text-2xl" aria-hidden="true">
        {input.icon}
      </span>
      <span>
        <span className="block text-base font-semibold">{input.label}</span>
        {input.hint ? (
          <span className="block text-[10px] font-medium opacity-75">
            {input.hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function PickerModal(input: {
  title: string;
  players: TeamRosterEntry[];
  events: BeerEvent[];
  type: BeerEventType;
  action: "record" | "remove";
  onClose: () => void;
  onSelect: (playerId: string) => void;
}) {
  const selectionMadeRef = useRef(false);

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/50 p-4 sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold">{input.title}</h3>
          <button className="rounded px-2 py-1 text-sm" onClick={input.onClose}>
            Close
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {input.players.map((player) => {
            const count = input.events.filter(
              (event) =>
                event.playerId === player.playerId && event.type === input.type,
            ).length;
            const label =
              input.type === "normal"
                ? count === 1
                  ? "beer"
                  : "beers"
                : count === 1
                  ? "juice"
                  : "juices";

            return (
              <button
                key={player.playerId}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-4 text-left disabled:opacity-40 dark:border-zinc-700"
                disabled={input.action === "remove" && count === 0}
                onClick={() => {
                  if (selectionMadeRef.current) {
                    return;
                  }
                  selectionMadeRef.current = true;
                  input.onSelect(player.playerId);
                }}
              >
                <PlayerAvatar
                  name={player.playerName}
                  photoUrl={player.playerPhotoUrl}
                  sizeClassName="h-14 w-14"
                />
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-medium">{player.playerName}</div>
                    <div className="text-sm text-zinc-500">
                      {input.action === "record"
                        ? "Tap to record"
                        : count > 0
                          ? "Tap to subtract one"
                          : "None to subtract"}
                    </div>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold tabular-nums dark:bg-zinc-800">
                    {count} {label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal(input: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/50 p-4 sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:bg-zinc-950">
        <h3 className="text-lg font-semibold">{input.title}</h3>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            className="rounded-2xl border border-zinc-300 px-4 py-4 text-base font-medium dark:border-zinc-700"
            onClick={input.onCancel}
          >
            No
          </button>
          <button
            className="rounded-2xl bg-zinc-900 px-4 py-4 text-base font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            onClick={input.onConfirm}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerAvatar(input: {
  name: string;
  photoUrl: string | null;
  sizeClassName: string;
}) {
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
        className={`${input.sizeClassName} rounded-full object-cover`}
        src={input.photoUrl}
      />
    );
  }

  return (
    <div
      className={`${input.sizeClassName} flex items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200`}
    >
      {initials}
    </div>
  );
}
