import { buildTournamentSnapshot } from "@/lib/liveTournament";
import { getSupabaseClient } from "@/lib/supabase";
import type {
  BeerEvent,
  Hole,
  HoleScore,
  Team,
  TeamPlayer,
  TeamRosterEntry,
  Tournament,
  TournamentSnapshot,
} from "@/types";

type TournamentRow = {
  id: string;
  join_code: string;
  name: string;
  date: string;
  course_id: string;
  tee_set_id: string;
  birdie_juice_enabled: boolean;
  beer_scoring_mode: Tournament["beerScoringMode"];
  status: Tournament["status"];
  created_at: string;
};

type HoleRow = {
  id: string;
  tee_set_id: string;
  number: number;
  par: number;
  yardage: number | null;
  handicap: number | null;
};

type TeamRow = {
  id: string;
  tournament_id: string;
  name: string;
  captain_player_id: string | null;
  access_token: string;
  draft_order: number;
};

type PlayerRow = {
  id: string;
  name: string;
  golf_handicap: number | null;
  beer_handicap: number | null;
  photo_url: string | null;
};

type TeamPlayerRow = {
  team_id: string;
  player_id: string;
  draft_position: number;
};

type HoleScoreRow = {
  id: string;
  team_id: string;
  hole_id: string;
  strokes: number;
  operation_id: string;
  entered_at: string;
  updated_at: string;
  created_at: string;
};

type BeerEventRow = {
  id: string;
  team_id: string;
  player_id: string;
  hole_id: string | null;
  type: BeerEvent["type"];
  operation_id: string;
  created_at: string;
};

function mapTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    joinCode: row.join_code,
    name: row.name,
    date: row.date,
    courseId: row.course_id,
    teeSetId: row.tee_set_id,
    birdieJuiceEnabled: row.birdie_juice_enabled,
    beerScoringMode: row.beer_scoring_mode,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapHole(row: HoleRow): Hole {
  return {
    id: row.id,
    teeSetId: row.tee_set_id,
    number: row.number,
    par: row.par,
    yardage: row.yardage,
    handicap: row.handicap,
  };
}

function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
    captainPlayerId: row.captain_player_id,
    accessToken: row.access_token,
    draftOrder: row.draft_order,
  };
}

function mapHoleScore(row: HoleScoreRow): HoleScore {
  return {
    id: row.id,
    teamId: row.team_id,
    holeId: row.hole_id,
    strokes: row.strokes,
    operationId: row.operation_id,
    enteredAt: row.entered_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function mapBeerEvent(row: BeerEventRow): BeerEvent {
  return {
    id: row.id,
    teamId: row.team_id,
    playerId: row.player_id,
    holeId: row.hole_id,
    type: row.type,
    operationId: row.operation_id,
    createdAt: row.created_at,
  };
}

export async function listTeams(tournamentId?: string): Promise<Team[]> {
  const supabase = getSupabaseClient();
  const query = supabase
    .from("teams")
    .select("id,tournament_id,name,captain_player_id,access_token,draft_order")
    .order("draft_order", { ascending: true });
  const finalQuery = tournamentId ? query.eq("tournament_id", tournamentId) : query;
  const { data, error } = await finalQuery;

  if (error) {
    throw new Error(`Failed to list teams: ${error.message}`);
  }

  return (data ?? []).map((row) => mapTeam(row as TeamRow));
}

export async function listHoles(teeSetId: string): Promise<Hole[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("holes")
    .select("id,tee_set_id,number,par,yardage,handicap")
    .eq("tee_set_id", teeSetId)
    .order("number", { ascending: true });

  if (error) {
    throw new Error(`Failed to list holes: ${error.message}`);
  }

  return (data ?? []).map((row) => mapHole(row as HoleRow));
}

export async function addTeamPlayer(input: {
  teamId: string;
  playerId: string;
}): Promise<TeamPlayer> {
  const supabase = getSupabaseClient();
  const { data: teamRow, error: teamError } = await supabase
    .from("teams")
    .select("tournament_id,captain_player_id")
    .eq("id", input.teamId)
    .single();

  if (teamError || !teamRow) {
    throw new Error(
      `Failed to load team for roster assignment: ${teamError?.message ?? "Unknown error"}`,
    );
  }

  const { data: tournamentTeams, error: tournamentTeamsError } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", teamRow.tournament_id);

  if (tournamentTeamsError) {
    throw new Error(`Failed to load tournament teams: ${tournamentTeamsError.message}`);
  }

  const tournamentTeamIds = (tournamentTeams ?? []).map((team) => team.id);
  if (tournamentTeamIds.length > 0) {
    const { data: existingTournamentPlayer, error: existingTournamentPlayerError } =
      await supabase
        .from("team_players")
        .select("team_id,player_id,draft_position")
        .eq("player_id", input.playerId)
        .in("team_id", tournamentTeamIds)
        .maybeSingle();

    if (existingTournamentPlayerError) {
      throw new Error(
        `Failed to validate drafted player: ${existingTournamentPlayerError.message}`,
      );
    }

    if (existingTournamentPlayer) {
      throw new Error("That player has already been assigned within this tournament.");
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("team_players")
    .select("team_id,player_id,draft_position")
    .eq("team_id", input.teamId)
    .order("draft_position", { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(`Failed to inspect team roster: ${existingError.message}`);
  }

  const nextDraftPosition = (existingRows?.[0]?.draft_position ?? 0) + 1;
  const { data, error } = await supabase
    .from("team_players")
    .insert({
      team_id: input.teamId,
      player_id: input.playerId,
      draft_position: nextDraftPosition,
    })
    .select("team_id,player_id,draft_position")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to assign player to team: ${error?.message ?? "Unknown error"}`,
    );
  }

  if (!teamRow.captain_player_id && nextDraftPosition === 1) {
    const { error: captainError } = await supabase
      .from("teams")
      .update({ captain_player_id: input.playerId })
      .eq("id", input.teamId);

    if (captainError) {
      throw new Error(`Failed to assign team captain: ${captainError.message}`);
    }
  }

  return {
    teamId: data.team_id,
    playerId: data.player_id,
    draftPosition: data.draft_position,
  };
}

export async function updateTournamentStatus(input: {
  tournamentId: string;
  status: Tournament["status"];
}): Promise<Tournament> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tournaments")
    .update({ status: input.status })
    .eq("id", input.tournamentId)
    .select(
      "id,join_code,name,date,course_id,tee_set_id,birdie_juice_enabled,beer_scoring_mode,status,created_at",
    )
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to update tournament status: ${error?.message ?? "Unknown error"}`,
    );
  }

  return mapTournament(data as TournamentRow);
}

export async function validateTeamAccess(input: {
  tournamentId: string;
  teamId: string;
  accessToken: string;
}): Promise<Team> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id,tournament_id,name,captain_player_id,access_token,draft_order")
    .eq("id", input.teamId)
    .eq("tournament_id", input.tournamentId)
    .eq("access_token", input.accessToken)
    .single();

  if (error || !data) {
    throw new Error("This team live link is invalid or has expired.");
  }

  return mapTeam(data as TeamRow);
}

export async function submitHoleScore(input: {
  teamId: string;
  holeId: string;
  strokes: number;
  operationId: string;
  enteredAt: string;
}): Promise<HoleScore> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .rpc("submit_hole_score", {
      p_team_id: input.teamId,
      p_hole_id: input.holeId,
      p_strokes: input.strokes,
      p_operation_id: input.operationId,
      p_entered_at: input.enteredAt,
    })
    .single();

  if (error || !data) {
    throw new Error(`Failed to submit hole score: ${error?.message ?? "Unknown error"}`);
  }

  return mapHoleScore(data as HoleScoreRow);
}

export async function logBeerEvent(input: {
  teamId: string;
  playerId: string;
  holeId: string | null;
  type: BeerEvent["type"];
  operationId: string;
}): Promise<BeerEvent> {
  const supabase = getSupabaseClient();
  if (input.type === "birdie_juice") {
    const { data: teamRow, error: teamError } = await supabase
      .from("teams")
      .select("tournament_id")
      .eq("id", input.teamId)
      .single();

    if (teamError || !teamRow) {
      throw new Error(`Failed to load team for drink event: ${teamError?.message ?? "Unknown error"}`);
    }

    const { data: tournamentRow, error: tournamentError } = await supabase
      .from("tournaments")
      .select("birdie_juice_enabled")
      .eq("id", teamRow.tournament_id)
      .single();

    if (tournamentError || !tournamentRow) {
      throw new Error(
        `Failed to load tournament settings: ${tournamentError?.message ?? "Unknown error"}`,
      );
    }

    if (!tournamentRow.birdie_juice_enabled) {
      throw new Error("Birdie juice is disabled for this tournament.");
    }
  }

  const { data, error } = await supabase
    .from("beer_events")
    .upsert(
      {
        team_id: input.teamId,
        player_id: input.playerId,
        hole_id: input.holeId,
        type: input.type,
        operation_id: input.operationId,
      },
      { onConflict: "operation_id", ignoreDuplicates: false },
    )
    .select("id,team_id,player_id,hole_id,type,operation_id,created_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to log drink event: ${error?.message ?? "Unknown error"}`);
  }

  return mapBeerEvent(data as BeerEventRow);
}

export async function undoLastBeerEvent(input: {
  teamId: string;
  type: BeerEvent["type"];
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: latestEvent, error: latestError } = await supabase
    .from("beer_events")
    .select("id")
    .eq("team_id", input.teamId)
    .eq("type", input.type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new Error(`Failed to load recent drink event: ${latestError.message}`);
  }

  if (!latestEvent) {
    throw new Error("There is no matching drink to undo.");
  }

  const { error } = await supabase.from("beer_events").delete().eq("id", latestEvent.id);
  if (error) {
    throw new Error(`Failed to undo drink event: ${error.message}`);
  }
}

export async function deleteBeerEvent(input: {
  eventId: string;
  operationId: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const query = supabase.from("beer_events").delete();
  const { error } = input.eventId.startsWith("optimistic:")
    ? await query.eq("operation_id", input.operationId)
    : await query.eq("id", input.eventId);
  if (error) {
    throw new Error(`Failed to undo drink event: ${error.message}`);
  }
}

export async function getTournamentSnapshot(
  tournamentId: string,
): Promise<TournamentSnapshot> {
  const supabase = getSupabaseClient();
  const { data: tournamentData, error: tournamentError } = await supabase
    .from("tournaments")
    .select(
      "id,join_code,name,date,course_id,tee_set_id,birdie_juice_enabled,beer_scoring_mode,status,created_at",
    )
    .eq("id", tournamentId)
    .single();

  if (tournamentError || !tournamentData) {
    throw new Error(
      `Failed to load tournament: ${tournamentError?.message ?? "Unknown error"}`,
    );
  }

  const tournament = mapTournament(tournamentData as TournamentRow);

  const [holes, teams] = await Promise.all([
    listHoles(tournament.teeSetId),
    listTeams(tournamentId),
  ]);

  const teamIds = teams.map((team) => team.id);
  const captainIds = teams
    .map((team) => team.captainPlayerId)
    .filter((captainPlayerId): captainPlayerId is string => captainPlayerId !== null);

  const [teamPlayerRowsResult, playerRowsResult, holeScoresResult, beerEventsResult] =
    await Promise.all([
      teamIds.length
        ? supabase
            .from("team_players")
            .select("team_id,player_id,draft_position")
            .in("team_id", teamIds)
        : Promise.resolve({ data: [], error: null }),
      captainIds.length
        ? supabase
            .from("players")
            .select("id,name,golf_handicap,beer_handicap,photo_url")
            .in("id", captainIds)
        : Promise.resolve({ data: [], error: null }),
      teamIds.length
        ? supabase
            .from("hole_scores")
            .select(
              "id,team_id,hole_id,strokes,operation_id,entered_at,updated_at,created_at",
            )
            .in("team_id", teamIds)
        : Promise.resolve({ data: [], error: null }),
      teamIds.length
        ? supabase
            .from("beer_events")
            .select("id,team_id,player_id,hole_id,type,operation_id,created_at")
            .in("team_id", teamIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (teamPlayerRowsResult.error) {
    throw new Error(`Failed to load team roster: ${teamPlayerRowsResult.error.message}`);
  }
  if (playerRowsResult.error) {
    throw new Error(`Failed to load players: ${playerRowsResult.error.message}`);
  }
  if (holeScoresResult.error) {
    throw new Error(`Failed to load hole scores: ${holeScoresResult.error.message}`);
  }
  if (beerEventsResult.error) {
    throw new Error(`Failed to load drink events: ${beerEventsResult.error.message}`);
  }

  const teamPlayerRows = (teamPlayerRowsResult.data ?? []) as TeamPlayerRow[];
  const rosterPlayerIds = teamPlayerRows.map((row) => row.player_id);
  const missingPlayerIds = rosterPlayerIds.filter(
    (playerId) => !(playerRowsResult.data ?? []).some((player) => player.id === playerId),
  );

  let allPlayerRows = [...((playerRowsResult.data ?? []) as PlayerRow[])];
  if (missingPlayerIds.length > 0) {
    const { data: rosterPlayers, error: rosterPlayersError } = await supabase
      .from("players")
      .select("id,name,golf_handicap,beer_handicap,photo_url")
      .in("id", missingPlayerIds);

    if (rosterPlayersError) {
      throw new Error(`Failed to load roster players: ${rosterPlayersError.message}`);
    }

    allPlayerRows = allPlayerRows.concat((rosterPlayers ?? []) as PlayerRow[]);
  }

  const playersById = new Map(
    allPlayerRows.map((player) => [
      player.id,
      {
        id: player.id,
        name: player.name,
        golfHandicap: player.golf_handicap,
        beerHandicap: player.beer_handicap,
        photoUrl: player.photo_url,
      },
    ]),
  );

  const rostersByTeamId = new Map<string, TeamRosterEntry[]>();
  for (const row of teamPlayerRows) {
    const player = playersById.get(row.player_id);
    if (!player) {
      continue;
    }
    const existing = rostersByTeamId.get(row.team_id) ?? [];
    existing.push({
      teamId: row.team_id,
      playerId: row.player_id,
      playerName: player.name,
      playerPhotoUrl: player.photoUrl,
      beerHandicap: player.beerHandicap,
      draftPosition: row.draft_position,
    });
    rostersByTeamId.set(
      row.team_id,
      existing.sort((left, right) => left.draftPosition - right.draftPosition),
    );
  }

  for (const team of teams) {
    if (!team.captainPlayerId) {
      continue;
    }
    const captain = playersById.get(team.captainPlayerId);
    if (captain && !rostersByTeamId.has(team.id)) {
      rostersByTeamId.set(team.id, [
        {
          teamId: team.id,
          playerId: captain.id,
          playerName: captain.name,
          playerPhotoUrl: captain.photoUrl,
          beerHandicap: captain.beerHandicap,
          draftPosition: 1,
        },
      ]);
    }
  }

  const scoresByTeamId = new Map<string, HoleScore[]>();
  for (const row of (holeScoresResult.data ?? []) as HoleScoreRow[]) {
    const mapped = mapHoleScore(row);
    const existing = scoresByTeamId.get(mapped.teamId) ?? [];
    existing.push(mapped);
    scoresByTeamId.set(mapped.teamId, existing);
  }

  const eventsByTeamId = new Map<string, BeerEvent[]>();
  for (const row of (beerEventsResult.data ?? []) as BeerEventRow[]) {
    const mapped = mapBeerEvent(row);
    const existing = eventsByTeamId.get(mapped.teamId) ?? [];
    existing.push(mapped);
    eventsByTeamId.set(mapped.teamId, existing);
  }

  return buildTournamentSnapshot({
    tournament,
    holes,
    teams,
    playersById,
    rostersByTeamId,
    scoresByTeamId,
    eventsByTeamId,
  });
}
