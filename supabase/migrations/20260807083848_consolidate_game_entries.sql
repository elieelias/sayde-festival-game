create table public.game_entries (
  id uuid primary key default gen_random_uuid(),
  name text check (name is null or char_length(name) between 1 and 60),
  phone_number text check (
    phone_number is null or char_length(phone_number) between 7 and 24
  ),
  token uuid not null unique default gen_random_uuid(),
  url text not null unique,
  is_used boolean not null default false,
  score integer check (score is null or score >= 0),
  used_at timestamptz,
  constraint game_entries_usage_consistency_check
    check (
      (is_used = false and used_at is null)
      or (is_used = true and used_at is not null)
    )
);

insert into public.game_entries (
  id,
  name,
  phone_number,
  token,
  url,
  is_used,
  score,
  used_at
)
select
  id,
  null,
  null,
  token,
  '/?token=' || token::text,
  is_used,
  null,
  used_at
from public.game_tokens;

alter table public.game_entries enable row level security;

-- Tokens and phone numbers are private. Access is server-only.
revoke all on table public.game_entries from anon, authenticated;
grant all on table public.game_entries to service_role;

drop table public.game_scores;
drop table public.game_tokens;

comment on table public.game_entries is
  'The single festival game table: one row per QR token and eventual player result.';
