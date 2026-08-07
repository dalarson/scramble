alter table tournaments
  add column if not exists birdie_juice_enabled boolean not null default false,
  add column if not exists beer_scoring_mode text not null default 'gross'
    check (beer_scoring_mode in ('gross', 'net'));
