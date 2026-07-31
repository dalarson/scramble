alter table teams
add column if not exists draft_order integer;

with ranked_teams as (
  select
    id,
    row_number() over (
      partition by tournament_id
      order by name asc, id asc
    ) as next_draft_order
  from teams
  where draft_order is null
)
update teams
set draft_order = ranked_teams.next_draft_order
from ranked_teams
where teams.id = ranked_teams.id;

alter table teams
alter column draft_order set not null;

create unique index if not exists teams_tournament_draft_order_key
on teams (tournament_id, draft_order);
