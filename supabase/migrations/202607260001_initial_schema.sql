create extension if not exists pgcrypto;

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists tee_sets (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  name text not null,
  course_rating numeric(4, 1) not null,
  slope_rating integer not null check (slope_rating > 0),
  total_par integer not null check (total_par > 0)
);

create table if not exists holes (
  id uuid primary key default gen_random_uuid(),
  tee_set_id uuid not null references tee_sets(id) on delete cascade,
  number integer not null check (number between 1 and 18),
  par integer not null check (par between 3 and 6),
  yardage integer check (yardage > 0),
  handicap integer check (handicap between 1 and 18),
  unique (tee_set_id, number)
);

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  join_code text not null unique,
  name text not null,
  date date not null,
  course_id uuid not null references courses(id),
  tee_set_id uuid not null references tee_sets(id),
  status text not null check (status in ('draft', 'live', 'complete', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  golf_handicap numeric(4, 1),
  beer_handicap numeric(4, 1),
  photo_url text
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  captain_player_id uuid not null references players(id),
  unique (tournament_id, name)
);

create table if not exists team_players (
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  draft_position integer not null check (draft_position > 0),
  primary key (team_id, player_id),
  unique (team_id, draft_position)
);

create table if not exists hole_scores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  hole_id uuid not null references holes(id) on delete cascade,
  strokes integer not null check (strokes between 1 and 15),
  created_at timestamptz not null default now(),
  unique (team_id, hole_id)
);

create table if not exists beer_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id),
  hole_id uuid references holes(id),
  type text not null check (type in ('normal', 'birdie_juice')),
  created_at timestamptz not null default now()
);
