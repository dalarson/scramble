import { getNextSnakePick, MAX_TEAM_PLAYERS } from "@/lib/draft";
import { getSupabaseClient } from "@/lib/supabase";
import { addTeamPlayer, listTeams } from "@/services/liveTournament";
import { listPlayers, listTournaments } from "@/services/tournamentSetup";
import type {
  DraftSnapshot,
  TeamPlayer,
  TeamRosterEntry,
  Tournament,
} from "@/types";

type TeamPlayerRow = {
  team_id: string;
  player_id: string;
  draft_position: number;
};

async function getTournamentById(tournamentId: string): Promise<Tournament> {
  const tournaments = await listTournaments();
  const tournament = tournaments.find((entry) => entry.id === tournamentId);

  if (!tournament) {
    throw new Error("Draft tournament could not be found.");
  }

  return tournament;
}

async function ensureCaptainsPersisted(input: {
  tournamentId: string;
  teamIds: string[];
}): Promise<void> {
  const supabase = getSupabaseClient();
  const teams = await listTeams(input.tournamentId);
  const { data: teamPlayerRows, error } = await supabase
    .from("team_players")
    .select("team_id,player_id,draft_position")
    .in("team_id", input.teamIds);

  if (error) {
    throw new Error(`Failed to load draft rosters: ${error.message}`);
  }

  const existingRows = (teamPlayerRows ?? []) as TeamPlayerRow[];
  const missingCaptainRows = teams
    .filter(
      (team) =>
        !existingRows.some(
          (row) =>
            row.team_id === team.id && row.player_id === team.captainPlayerId,
        ),
    )
    .map((team) => ({
      team_id: team.id,
      player_id: team.captainPlayerId,
      draft_position: 1,
    }));

  if (missingCaptainRows.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("team_players")
    .insert(missingCaptainRows);

  if (insertError) {
    throw new Error(`Failed to persist captains in draft rosters: ${insertError.message}`);
  }
}

async function loadTournamentTeamPlayers(teamIds: string[]): Promise<TeamPlayerRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("team_players")
    .select("team_id,player_id,draft_position")
    .in("team_id", teamIds)
    .order("draft_position", { ascending: true });

  if (error) {
    throw new Error(`Failed to load draft picks: ${error.message}`);
  }

  return (data ?? []) as TeamPlayerRow[];
}

export async function getDraftSnapshot(tournamentId: string): Promise<DraftSnapshot> {
  const [tournament, teams, players] = await Promise.all([
    getTournamentById(tournamentId),
    listTeams(tournamentId),
    listPlayers(),
  ]);

  if (teams.length < 2) {
    throw new Error("Create at least two teams before starting the snake draft.");
  }

  await ensureCaptainsPersisted({
    tournamentId,
    teamIds: teams.map((team) => team.id),
  });

  const teamPlayerRows = await loadTournamentTeamPlayers(teams.map((team) => team.id));
  const playersById = new Map(players.map((player) => [player.id, player]));
  const draftedPlayerIds = new Set(teamPlayerRows.map((row) => row.player_id));
  const rostersByTeamId = new Map<string, TeamRosterEntry[]>();
  const draftedPlayersByTeamId = new Map<string, TeamPlayer[]>();

  for (const row of teamPlayerRows) {
    const player = playersById.get(row.player_id);
    if (!player) {
      continue;
    }

    const rosterEntries = rostersByTeamId.get(row.team_id) ?? [];
    rosterEntries.push({
      teamId: row.team_id,
      playerId: row.player_id,
      playerName: player.name,
      playerPhotoUrl: player.photoUrl,
      draftPosition: row.draft_position,
    });
    rostersByTeamId.set(row.team_id, rosterEntries);

    const draftedPlayers = draftedPlayersByTeamId.get(row.team_id) ?? [];
    draftedPlayers.push({
      teamId: row.team_id,
      playerId: row.player_id,
      draftPosition: row.draft_position,
    });
    draftedPlayersByTeamId.set(row.team_id, draftedPlayers);
  }

  const nextPick = getNextSnakePick({
    teamIds: teams.map((team) => team.id),
    draftedPlayersByTeamId,
    maxPlayersPerTeam: MAX_TEAM_PLAYERS,
  });

  return {
    tournament,
    teams: teams.map((team) => ({
      team,
      captain: playersById.get(team.captainPlayerId) ?? null,
      players: rostersByTeamId.get(team.id) ?? [],
    })),
    availablePlayers: players.filter((player) => !draftedPlayerIds.has(player.id)),
    nextPick: nextPick
      ? {
          ...nextPick,
          teamName: teams.find((team) => team.id === nextPick.teamId)?.name ?? "Unknown team",
        }
      : null,
    maxPlayersPerTeam: MAX_TEAM_PLAYERS,
    isComplete: nextPick === null,
  };
}

export async function draftPlayer(input: {
  tournamentId: string;
  teamId: string;
  playerId: string;
}): Promise<TeamPlayer> {
  const snapshot = await getDraftSnapshot(input.tournamentId);

  if (!snapshot.nextPick) {
    throw new Error("This draft is already complete.");
  }
  if (snapshot.nextPick.teamId !== input.teamId) {
    throw new Error("It is not this team's turn to pick.");
  }

  const team = snapshot.teams.find((entry) => entry.team.id === input.teamId);
  if (!team) {
    throw new Error("Draft team could not be found.");
  }
  if (team.players.length >= snapshot.maxPlayersPerTeam) {
    throw new Error("This team is already full.");
  }

  return addTeamPlayer({
    teamId: input.teamId,
    playerId: input.playerId,
  });
}

export async function moveTeamDraftOrder(input: {
  tournamentId: string;
  teamId: string;
  direction: "up" | "down";
}): Promise<void> {
  const supabase = getSupabaseClient();
  const teams = await listTeams(input.tournamentId);
  const currentIndex = teams.findIndex((team) => team.id === input.teamId);

  if (currentIndex === -1) {
    throw new Error("Draft team could not be found.");
  }

  const swapIndex = input.direction === "up" ? currentIndex - 1 : currentIndex + 1;
  const currentTeam = teams[currentIndex];
  const swapTeam = teams[swapIndex];

  if (!swapTeam) {
    return;
  }

  const { error: tempError } = await supabase
    .from("teams")
    .update({ draft_order: 0 })
    .eq("id", currentTeam.id);

  if (tempError) {
    throw new Error(`Failed to reorder draft teams: ${tempError.message}`);
  }

  const { error: swapError } = await supabase
    .from("teams")
    .update({ draft_order: currentTeam.draftOrder })
    .eq("id", swapTeam.id);

  if (swapError) {
    throw new Error(`Failed to reorder draft teams: ${swapError.message}`);
  }

  const { error: finalizeError } = await supabase
    .from("teams")
    .update({ draft_order: swapTeam.draftOrder })
    .eq("id", currentTeam.id);

  if (finalizeError) {
    throw new Error(`Failed to reorder draft teams: ${finalizeError.message}`);
  }
}
