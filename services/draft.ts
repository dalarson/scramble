import { getNextSnakePick, getSnakePickSequence, MAX_TEAM_PLAYERS } from "@/lib/draft";
import { getSupabaseClient } from "@/lib/supabase";
import { addTeamPlayer, listTeams } from "@/services/liveTournament";
import { createTeam, listPlayers, listTournaments } from "@/services/tournamentSetup";
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

async function loadTournamentTeamPlayers(teamIds: string[]): Promise<TeamPlayerRow[]> {
  if (teamIds.length === 0) {
    return [];
  }

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

async function assertNoStartedDraftPicks(tournamentId: string, message: string): Promise<void> {
  const teams = await listTeams(tournamentId);
  const teamIds = teams.map((team) => team.id);
  const teamPlayers = await loadTournamentTeamPlayers(teamIds);
  if (teamPlayers.length > 0) {
    throw new Error(message);
  }
}

export async function getDraftSnapshot(tournamentId: string): Promise<DraftSnapshot> {
  const [tournament, teams, players] = await Promise.all([
    getTournamentById(tournamentId),
    listTeams(tournamentId),
    listPlayers(tournamentId),
  ]);

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
      beerHandicap: player.beerHandicap,
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

  const hasEnoughTeams = teams.length >= 2;
  const canRunDraft = hasEnoughTeams;
  const nextPick = canRunDraft
    ? getNextSnakePick({
        teamIds: teams.map((team) => team.id),
        draftedPlayersByTeamId,
        maxPlayersPerTeam: MAX_TEAM_PLAYERS,
      })
    : null;

  return {
    tournament,
    teams: teams.map((team) => ({
      team,
      captain: team.captainPlayerId
        ? (playersById.get(team.captainPlayerId) ?? null)
        : null,
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
    isComplete: canRunDraft && nextPick === null,
  };
}

export async function draftPlayer(input: {
  tournamentId: string;
  teamId: string;
  playerId: string;
}): Promise<TeamPlayer> {
  const snapshot = await getDraftSnapshot(input.tournamentId);

  if (!snapshot.nextPick) {
    if (snapshot.teams.length < 2) {
      throw new Error("Create at least two teams before starting the draft.");
    }
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

export async function createDraftTeam(input: {
  tournamentId: string;
  name: string;
}): Promise<void> {
  await createTeam({
    tournamentId: input.tournamentId,
    name: input.name,
  });
}

export async function renameDraftTeam(input: {
  teamId: string;
  name: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("teams")
    .update({ name: input.name.trim() })
    .eq("id", input.teamId);

  if (error) {
    throw new Error(`Failed to rename team: ${error.message}`);
  }
}

export async function removeDraftTeam(input: {
  tournamentId: string;
  teamId: string;
}): Promise<void> {
  await assertNoStartedDraftPicks(
    input.tournamentId,
    "Undo drafted picks before removing teams.",
  );

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("teams").delete().eq("id", input.teamId);
  if (error) {
    throw new Error(`Failed to remove team: ${error.message}`);
  }
}

export async function removeDraftPlayer(playerId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: teamRows, error: teamRowsError } = await supabase
    .from("team_players")
    .select("team_id")
    .eq("player_id", playerId)
    .limit(1);

  if (teamRowsError) {
    throw new Error(`Failed to validate player usage: ${teamRowsError.message}`);
  }
  if ((teamRows ?? []).length > 0) {
    throw new Error("Remove this player from team rosters before deleting.");
  }

  const { data: captainRows, error: captainRowsError } = await supabase
    .from("teams")
    .select("id")
    .eq("captain_player_id", playerId)
    .limit(1);

  if (captainRowsError) {
    throw new Error(`Failed to validate captain assignments: ${captainRowsError.message}`);
  }
  if ((captainRows ?? []).length > 0) {
    throw new Error("Unassign this player as captain before deleting.");
  }

  const { error: deleteError } = await supabase.from("players").delete().eq("id", playerId);
  if (deleteError) {
    throw new Error(`Failed to remove player: ${deleteError.message}`);
  }
}

export async function undoLastDraftPick(tournamentId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const teams = await listTeams(tournamentId);
  const teamIds = teams.map((team) => team.id);
  const teamPlayerRows = await loadTournamentTeamPlayers(teamIds);

  const picksByTeamId = new Map<
    string,
    { teamId: string; playerId: string; draftPosition: number }[]
  >();
  for (const row of teamPlayerRows) {
    const picks = picksByTeamId.get(row.team_id) ?? [];
    picks.push({
      teamId: row.team_id,
      playerId: row.player_id,
      draftPosition: row.draft_position,
    });
    picksByTeamId.set(row.team_id, picks);
  }

  const totalPicks = teamIds.reduce(
    (sum, teamId) => sum + (picksByTeamId.get(teamId)?.length ?? 0),
    0,
  );

  if (totalPicks === 0) {
    throw new Error("There are no picks to undo.");
  }

  const sequence = getSnakePickSequence(teamIds, MAX_TEAM_PLAYERS);
  const lastPickSummary = sequence[totalPicks - 1];

  if (!lastPickSummary) {
    throw new Error("Could not determine the last pick to undo.");
  }

  const teamPicks = (picksByTeamId.get(lastPickSummary.teamId) ?? []).sort(
    (a, b) => b.draftPosition - a.draftPosition,
  );
  const lastPick = teamPicks[0];

  if (!lastPick) {
    throw new Error("Could not find the last pick to undo.");
  }

  const { error } = await supabase
    .from("team_players")
    .delete()
    .eq("team_id", lastPick.teamId)
    .eq("player_id", lastPick.playerId);

  if (error) {
    throw new Error(`Failed to undo last pick: ${error.message}`);
  }

  if (lastPick.draftPosition === 1) {
    const { error: clearCaptainError } = await supabase
      .from("teams")
      .update({ captain_player_id: null })
      .eq("id", lastPick.teamId);

    if (clearCaptainError) {
      throw new Error(`Failed to clear captain assignment: ${clearCaptainError.message}`);
    }
  }
}
