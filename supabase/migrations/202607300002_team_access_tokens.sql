alter table teams
add column if not exists access_token text not null default encode(gen_random_bytes(12), 'hex');

create unique index if not exists teams_access_token_key on teams(access_token);
