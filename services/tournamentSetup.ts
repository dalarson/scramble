import { getSupabaseClient } from "@/lib/supabase";
import type { Course, Hole, Player, Team, TeeSet, Tournament } from "@/types";

type CourseRow = {
  id: string;
  name: string;
  location: string | null;
  created_at: string;
};

type TeeSetRow = {
  id: string;
  course_id: string;
  name: string;
  course_rating: number;
  slope_rating: number;
  total_par: number;
};

type HoleRow = {
  id: string;
  tee_set_id: string;
  number: number;
  par: number;
  yardage: number | null;
  handicap: number | null;
};

type PlayerRow = {
  id: string;
  name: string;
  golf_handicap: number | null;
  beer_handicap: number | null;
  photo_url: string | null;
};

type TournamentRow = {
  id: string;
  join_code: string;
  name: string;
  date: string;
  course_id: string;
  tee_set_id: string;
  status: Tournament["status"];
  created_at: string;
};

type TeamRow = {
  id: string;
  tournament_id: string;
  name: string;
  captain_player_id: string;
  access_token: string;
  draft_order: number;
};

function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    createdAt: row.created_at,
  };
}

function mapTeeSet(row: TeeSetRow): TeeSet {
  return {
    id: row.id,
    courseId: row.course_id,
    name: row.name,
    courseRating: row.course_rating,
    slopeRating: row.slope_rating,
    totalPar: row.total_par,
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

function mapPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    name: row.name,
    golfHandicap: row.golf_handicap,
    beerHandicap: row.beer_handicap,
    photoUrl: row.photo_url,
  };
}

function mapTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    joinCode: row.join_code,
    name: row.name,
    date: row.date,
    courseId: row.course_id,
    teeSetId: row.tee_set_id,
    status: row.status,
    createdAt: row.created_at,
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

export async function listCourses(): Promise<Course[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id,name,location,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list courses: ${error.message}`);
  }

  return (data ?? []).map((row) => mapCourse(row as CourseRow));
}

export async function createCourse(input: {
  name: string;
  location?: string;
}): Promise<Course> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({
      name: input.name.trim(),
      location: input.location?.trim() || null,
    })
    .select("id,name,location,created_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create course: ${error?.message ?? "Unknown error"}`);
  }

  return mapCourse(data as CourseRow);
}

export async function listTeeSets(courseId?: string): Promise<TeeSet[]> {
  const supabase = getSupabaseClient();
  const query = supabase
    .from("tee_sets")
    .select("id,course_id,name,course_rating,slope_rating,total_par")
    .order("name", { ascending: true });
  const finalQuery = courseId ? query.eq("course_id", courseId) : query;
  const { data, error } = await finalQuery;

  if (error) {
    throw new Error(`Failed to list tee sets: ${error.message}`);
  }

  return (data ?? []).map((row) => mapTeeSet(row as TeeSetRow));
}

export async function createTeeSet(input: {
  courseId: string;
  name: string;
  courseRating: number;
  slopeRating: number;
  totalPar: number;
}): Promise<TeeSet> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tee_sets")
    .insert({
      course_id: input.courseId,
      name: input.name.trim(),
      course_rating: input.courseRating,
      slope_rating: input.slopeRating,
      total_par: input.totalPar,
    })
    .select("id,course_id,name,course_rating,slope_rating,total_par")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create tee set: ${error?.message ?? "Unknown error"}`);
  }

  return mapTeeSet(data as TeeSetRow);
}

export async function createHole(input: {
  teeSetId: string;
  number: number;
  par: number;
  yardage?: number;
  handicap?: number;
}): Promise<Hole> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("holes")
    .insert({
      tee_set_id: input.teeSetId,
      number: input.number,
      par: input.par,
      yardage: input.yardage ?? null,
      handicap: input.handicap ?? null,
    })
    .select("id,tee_set_id,number,par,yardage,handicap")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create hole: ${error?.message ?? "Unknown error"}`);
  }

  return mapHole(data as HoleRow);
}

export async function listPlayers(): Promise<Player[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("players")
    .select("id,name,golf_handicap,beer_handicap,photo_url")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to list players: ${error.message}`);
  }

  return (data ?? []).map((row) => mapPlayer(row as PlayerRow));
}

export async function createPlayer(input: {
  name: string;
  golfHandicap?: number;
  beerHandicap?: number;
}): Promise<Player> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("players")
    .insert({
      name: input.name.trim(),
      golf_handicap: input.golfHandicap ?? null,
      beer_handicap: input.beerHandicap ?? null,
    })
    .select("id,name,golf_handicap,beer_handicap,photo_url")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create player: ${error?.message ?? "Unknown error"}`);
  }

  return mapPlayer(data as PlayerRow);
}

export async function listTournaments(): Promise<Tournament[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("id,join_code,name,date,course_id,tee_set_id,status,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list tournaments: ${error.message}`);
  }

  return (data ?? []).map((row) => mapTournament(row as TournamentRow));
}

export async function createTournament(input: {
  name: string;
  date: string;
  courseId: string;
  teeSetId: string;
  status?: Tournament["status"];
}): Promise<Tournament> {
  const supabase = getSupabaseClient();
  const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      join_code: joinCode,
      name: input.name.trim(),
      date: input.date,
      course_id: input.courseId,
      tee_set_id: input.teeSetId,
      status: input.status ?? "draft",
    })
    .select("id,join_code,name,date,course_id,tee_set_id,status,created_at")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create tournament: ${error?.message ?? "Unknown error"}`,
    );
  }

  return mapTournament(data as TournamentRow);
}

export async function createTeam(input: {
  tournamentId: string;
  name: string;
  captainPlayerId: string;
}): Promise<Team> {
  const supabase = getSupabaseClient();
  const { data: existingTeams, error: existingTeamsError } = await supabase
    .from("teams")
    .select("draft_order")
    .eq("tournament_id", input.tournamentId)
    .order("draft_order", { ascending: false })
    .limit(1);

  if (existingTeamsError) {
    throw new Error(`Failed to load current draft order: ${existingTeamsError.message}`);
  }

  const nextDraftOrder = (existingTeams?.[0]?.draft_order ?? 0) + 1;
  const { data, error } = await supabase
    .from("teams")
    .insert({
      tournament_id: input.tournamentId,
      name: input.name.trim(),
      captain_player_id: input.captainPlayerId,
      draft_order: nextDraftOrder,
    })
    .select("id,tournament_id,name,captain_player_id,access_token,draft_order")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create team: ${error?.message ?? "Unknown error"}`);
  }

  const createdTeam = mapTeam(data as TeamRow);
  const { error: captainAssignmentError } = await supabase.from("team_players").insert({
    team_id: createdTeam.id,
    player_id: createdTeam.captainPlayerId,
    draft_position: 1,
  });

  if (captainAssignmentError) {
    await supabase.from("teams").delete().eq("id", createdTeam.id);
    throw new Error(
      `Failed to add captain to team roster: ${captainAssignmentError.message}`,
    );
  }

  return createdTeam;
}
