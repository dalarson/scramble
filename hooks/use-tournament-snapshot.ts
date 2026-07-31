"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { getTournamentSnapshot } from "@/services/liveTournament";
import { listTournaments } from "@/services/tournamentSetup";

const QUERY_STALE_TIME_MS = 60_000;

export function useTournamentSnapshot(initialTournamentId?: string) {
  const queryClient = useQueryClient();
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    initialTournamentId ?? "",
  );

  const tournamentsQuery = useQuery({
    queryKey: ["tournaments"],
    queryFn: listTournaments,
    staleTime: QUERY_STALE_TIME_MS,
  });

  const effectiveSelectedTournamentId = useMemo(() => {
    if (selectedTournamentId) {
      return selectedTournamentId;
    }
    if (initialTournamentId) {
      return initialTournamentId;
    }
    return tournamentsQuery.data?.[0]?.id ?? "";
  }, [initialTournamentId, selectedTournamentId, tournamentsQuery.data]);

  const snapshotQuery = useQuery({
    queryKey: ["tournament-snapshot", effectiveSelectedTournamentId],
    queryFn: () => getTournamentSnapshot(effectiveSelectedTournamentId),
    enabled: Boolean(effectiveSelectedTournamentId),
    staleTime: QUERY_STALE_TIME_MS,
  });

  // Supabase Realtime — invalidate snapshot whenever hole_scores or
  // beer_events change so all connected devices see live updates.
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseClient>["channel"]> | null>(null);

  useEffect(() => {
    if (!effectiveSelectedTournamentId) {
      return;
    }

    const supabase = getSupabaseClient();
    const channelName = `tournament-sync-${effectiveSelectedTournamentId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hole_scores" },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["tournament-snapshot", effectiveSelectedTournamentId],
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "beer_events" },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["tournament-snapshot", effectiveSelectedTournamentId],
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [effectiveSelectedTournamentId, queryClient]);

  const refreshTournamentList = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    return tournamentsQuery.refetch();
  }, [queryClient, tournamentsQuery]);

  const refreshSnapshot = useCallback(
    async (tournamentId?: string) => {
      const targetTournamentId = tournamentId ?? effectiveSelectedTournamentId;
      if (!targetTournamentId) {
        return null;
      }

      await queryClient.invalidateQueries({
        queryKey: ["tournament-snapshot", targetTournamentId],
      });

      if (targetTournamentId === effectiveSelectedTournamentId) {
        return snapshotQuery.refetch();
      }

      return queryClient.fetchQuery({
        queryKey: ["tournament-snapshot", targetTournamentId],
        queryFn: () => getTournamentSnapshot(targetTournamentId),
        staleTime: QUERY_STALE_TIME_MS,
      });
    },
    [effectiveSelectedTournamentId, queryClient, snapshotQuery],
  );

  return {
    tournaments: tournamentsQuery.data ?? [],
    selectedTournamentId: effectiveSelectedTournamentId,
    setSelectedTournamentId,
    snapshot: snapshotQuery.data ?? null,
    loading:
      tournamentsQuery.isLoading ||
      snapshotQuery.isLoading ||
      tournamentsQuery.isFetching ||
      snapshotQuery.isFetching,
    error:
      tournamentsQuery.error instanceof Error
        ? tournamentsQuery.error.message
        : snapshotQuery.error instanceof Error
          ? snapshotQuery.error.message
          : null,
    refreshTournamentList,
    refreshSnapshot,
  };
}
