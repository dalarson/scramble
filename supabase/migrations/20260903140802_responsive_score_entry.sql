alter table public.hole_scores
add column if not exists operation_id uuid not null default gen_random_uuid(),
add column if not exists entered_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists hole_scores_operation_id_key
on public.hole_scores(operation_id);

alter table public.beer_events
add column if not exists operation_id uuid not null default gen_random_uuid();

create unique index if not exists beer_events_operation_id_key
on public.beer_events(operation_id);

create or replace function public.submit_hole_score(
  p_team_id uuid,
  p_hole_id uuid,
  p_strokes integer,
  p_operation_id uuid,
  p_entered_at timestamptz
)
returns public.hole_scores
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.hole_scores;
  effective_entered_at timestamptz := least(p_entered_at, now() + interval '5 minutes');
begin
  insert into public.hole_scores (
    team_id,
    hole_id,
    strokes,
    operation_id,
    entered_at,
    updated_at
  )
  values (
    p_team_id,
    p_hole_id,
    p_strokes,
    p_operation_id,
    effective_entered_at,
    now()
  )
  on conflict (team_id, hole_id) do update
  set
    strokes = excluded.strokes,
    operation_id = excluded.operation_id,
    entered_at = excluded.entered_at,
    updated_at = now()
  where
    excluded.entered_at > public.hole_scores.entered_at
    or (
      excluded.entered_at = public.hole_scores.entered_at
      and excluded.operation_id::text > public.hole_scores.operation_id::text
    )
  returning * into result;

  if not found then
    select *
    into result
    from public.hole_scores
    where team_id = p_team_id and hole_id = p_hole_id;
  end if;

  return result;
end;
$$;

revoke execute on function public.submit_hole_score(uuid, uuid, integer, uuid, timestamptz)
from public;

grant execute on function public.submit_hole_score(uuid, uuid, integer, uuid, timestamptz)
to anon, authenticated;