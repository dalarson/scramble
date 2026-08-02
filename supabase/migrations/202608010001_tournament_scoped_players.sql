-- Add tournament_id to players so players are scoped per tournament.
-- Adding as nullable to avoid breaking existing rows; app code enforces it for new creates.
alter table players
  add column if not exists tournament_id uuid references tournaments(id) on delete cascade;

create index if not exists players_tournament_id_idx on players(tournament_id);
