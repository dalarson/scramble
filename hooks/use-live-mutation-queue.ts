"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  mergeConfirmedDrink,
  mergeConfirmedScore,
  removeConfirmedDrink,
  type DrinkMutation,
  type LiveMutation,
  type ScoreMutation,
  type UndoDrinkMutation,
} from "@/lib/liveMutations";
import {
  deleteBeerEvent,
  logBeerEvent,
  submitHoleScore,
} from "@/services/liveTournament";
import type { BeerEvent, BeerEventType, TournamentSnapshot } from "@/types";

const STORAGE_KEY = "scramble-live-mutations-v1";
const MAX_AUTOMATIC_ATTEMPTS = 5;
const MAX_RETRY_DELAY_MS = 30_000;

function createOperationId() {
  return crypto.randomUUID();
}

function retryDelay(attempts: number) {
  return Math.min(1_000 * 2 ** Math.max(0, attempts - 1), MAX_RETRY_DELAY_MS);
}

function isLiveMutation(value: unknown): value is LiveMutation {
  if (!value || typeof value !== "object") {
    return false;
  }
  const mutation = value as Record<string, unknown>;
  const hasBaseFields =
    typeof mutation.operationId === "string" &&
    typeof mutation.tournamentId === "string" &&
    typeof mutation.teamId === "string" &&
    typeof mutation.enteredAt === "string" &&
    typeof mutation.attempts === "number" &&
    typeof mutation.nextAttemptAt === "number";
  if (!hasBaseFields) {
    return false;
  }
  if (mutation.kind === "score") {
    return typeof mutation.holeId === "string" && typeof mutation.strokes === "number";
  }
  if (mutation.kind === "drink") {
    return (
      typeof mutation.playerId === "string" &&
      (typeof mutation.holeId === "string" || mutation.holeId === null) &&
      (mutation.drinkType === "normal" || mutation.drinkType === "birdie_juice")
    );
  }
  return (
    mutation.kind === "undo-drink" &&
    typeof mutation.eventId === "string" &&
    typeof mutation.eventOperationId === "string" &&
    (mutation.drinkType === "normal" || mutation.drinkType === "birdie_juice")
  );
}

function readStoredMutations(): LiveMutation[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isLiveMutation)) {
      throw new Error("Stored live mutations are invalid.");
    }
    return parsed.map((mutation) => ({
      ...mutation,
      status: mutation.status === "failed" ? "failed" : "queued",
    }));
  } catch (error) {
    console.error("Unable to restore pending live tournament entries.", error);
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function useLiveMutationQueue() {
  const queryClient = useQueryClient();
  const [mutations, setMutations] = useState<LiveMutation[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [retryTick, setRetryTick] = useState(0);
  const lastEnteredAtRef = useRef(0);

  const nextEnteredAt = useCallback(() => {
    const timestamp = Math.max(Date.now(), lastEnteredAtRef.current + 1);
    lastEnteredAtRef.current = timestamp;
    return new Date(timestamp).toISOString();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMutations(readStoredMutations());
      setIsOnline(window.navigator.onLine);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mutations));
    } catch (error) {
      console.error("Unable to persist pending live tournament entries.", error);
    }
  }, [hydrated, mutations]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setRetryTick((current) => current + 1);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (
      !hydrated ||
      !isOnline ||
      mutations.some((mutation) => mutation.status === "saving")
    ) {
      return;
    }

    const now = Date.now();
    const candidate = mutations.find(
      (mutation) =>
        mutation.status === "queued" && mutation.nextAttemptAt <= now,
    );
    if (!candidate) {
      const nextAttemptAt = mutations
        .filter((mutation) => mutation.status === "queued")
        .reduce(
          (soonest, mutation) => Math.min(soonest, mutation.nextAttemptAt),
          Number.POSITIVE_INFINITY,
        );
      if (Number.isFinite(nextAttemptAt)) {
        const timer = window.setTimeout(
          () => setRetryTick((current) => current + 1),
          Math.max(0, nextAttemptAt - now),
        );
        return () => window.clearTimeout(timer);
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setMutations((current) =>
        current.map((mutation) =>
          mutation.operationId === candidate.operationId
            ? { ...mutation, status: "saving" }
            : mutation,
        ),
      );

      void (async () => {
        try {
          if (candidate.kind === "score") {
            const score = await submitHoleScore(candidate);
            queryClient.setQueryData<TournamentSnapshot>(
              ["tournament-snapshot", candidate.tournamentId],
              (snapshot) => mergeConfirmedScore(snapshot, score),
            );
          } else if (candidate.kind === "drink") {
            const event = await logBeerEvent({
              teamId: candidate.teamId,
              playerId: candidate.playerId,
              holeId: candidate.holeId,
              type: candidate.drinkType,
              operationId: candidate.operationId,
            });
            queryClient.setQueryData<TournamentSnapshot>(
              ["tournament-snapshot", candidate.tournamentId],
              (snapshot) => mergeConfirmedDrink(snapshot, event),
            );
          } else {
            await deleteBeerEvent({
              eventId: candidate.eventId,
              operationId: candidate.eventOperationId,
            });
            queryClient.setQueryData<TournamentSnapshot>(
              ["tournament-snapshot", candidate.tournamentId],
              (snapshot) =>
                removeConfirmedDrink(
                  snapshot,
                  candidate.teamId,
                  candidate.eventId,
                  candidate.eventOperationId,
                ),
            );
          }

          setMutations((current) =>
            current.filter(
              (mutation) =>
                mutation.operationId !== candidate.operationId &&
                (candidate.kind !== "undo-drink" ||
                  mutation.operationId !== candidate.eventOperationId),
            ),
          );
        } catch (error) {
          const attempts = candidate.attempts + 1;
          const message =
            error instanceof Error ? error.message : "Unable to save entry.";
          setMutations((current) =>
            current.map((mutation) =>
              mutation.operationId === candidate.operationId
                ? {
                    ...mutation,
                    attempts,
                    status:
                      attempts >= MAX_AUTOMATIC_ATTEMPTS ? "failed" : "queued",
                    nextAttemptAt: Date.now() + retryDelay(attempts),
                    error: message,
                  }
                : mutation,
            ),
          );
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated, isOnline, mutations, queryClient, retryTick]);

  const enqueueScore = useCallback(
    (input: {
      tournamentId: string;
      teamId: string;
      holeId: string;
      strokes: number;
    }) => {
      const mutation: ScoreMutation = {
        ...input,
        kind: "score",
        operationId: createOperationId(),
        enteredAt: nextEnteredAt(),
        status: "queued",
        attempts: 0,
        nextAttemptAt: Date.now(),
        error: null,
      };
      setMutations((current) => [
        ...current.filter(
          (existing) =>
            existing.kind !== "score" ||
            existing.teamId !== input.teamId ||
            existing.holeId !== input.holeId ||
            existing.status === "saving",
        ),
        mutation,
      ]);
      return mutation;
    },
    [nextEnteredAt],
  );

  const enqueueDrink = useCallback(
    (input: {
      tournamentId: string;
      teamId: string;
      playerId: string;
      holeId: string | null;
      drinkType: BeerEventType;
    }) => {
      const mutation: DrinkMutation = {
        ...input,
        kind: "drink",
        operationId: createOperationId(),
        enteredAt: nextEnteredAt(),
        status: "queued",
        attempts: 0,
        nextAttemptAt: Date.now(),
        error: null,
      };
      setMutations((current) => [...current, mutation]);
      return mutation;
    },
    [nextEnteredAt],
  );

  const enqueueDrinkUndo = useCallback(
    (input: {
      tournamentId: string;
      teamId: string;
      event: BeerEvent;
    }) => {
      const mutation: UndoDrinkMutation = {
        kind: "undo-drink",
        operationId: createOperationId(),
        tournamentId: input.tournamentId,
        teamId: input.teamId,
        eventId: input.event.id,
        eventOperationId: input.event.operationId,
        drinkType: input.event.type,
        enteredAt: nextEnteredAt(),
        status: "queued",
        attempts: 0,
        nextAttemptAt: Date.now(),
        error: null,
      };
      setMutations((current) => {
        const pendingEvent = current.find(
          (existing) =>
            existing.kind === "drink" &&
            existing.operationId === input.event.operationId,
        );
        if (pendingEvent && pendingEvent.status !== "saving") {
          return current.filter(
            (existing) =>
              existing.operationId !== input.event.operationId,
          );
        }
        return current.some(
          (existing) =>
            existing.kind === "undo-drink" &&
            existing.eventOperationId === input.event.operationId,
        )
          ? current
          : [...current, mutation];
      });
      return mutation;
    },
    [nextEnteredAt],
  );

  const retryMutation = useCallback((operationId: string) => {
    setMutations((current) =>
      current.map((mutation) =>
        mutation.operationId === operationId
          ? {
              ...mutation,
              status: "queued",
              attempts: 0,
              nextAttemptAt: Date.now(),
              error: null,
            }
          : mutation,
      ),
    );
  }, []);

  const discardMutation = useCallback((operationId: string) => {
    setMutations((current) =>
      current.filter((mutation) => mutation.operationId !== operationId),
    );
  }, []);

  return {
    mutations,
    hydrated,
    isOnline,
    enqueueScore,
    enqueueDrink,
    enqueueDrinkUndo,
    retryMutation,
    discardMutation,
  };
}
